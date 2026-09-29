import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createSignozClient } from "../../../src/client";
import { buildSignozMcpServer } from "../../../src/mcp";
import { FakeSignoz, type Seen, envelope, json } from "../fake-server";

interface RangeBody {
  requestType: string;
  compositeQuery: { queries: { type: string; spec: { filter?: { expression?: string }; name?: string } }[] };
}

let signoz: FakeSignoz;
let client: Client;
let dashboards: Map<string, Record<string, unknown>>;

/** query_range: a 400 for any filter naming `bogus`, otherwise one row or series per request type. */
function queryRange(body: RangeBody): Response {
  const filters = body.compositeQuery.queries.map((q) => q.spec.filter?.expression ?? "");
  if (filters.some((f) => f.includes("bogus"))) {
    return json(
      { status: "error", error: { type: "invalid-input", code: "invalid_input", message: "key `bogus` not found" } },
      400
    );
  }
  if (body.requestType === "scalar") {
    return envelope({
      type: "scalar",
      data: {
        results: [
          {
            queryName: "A",
            columns: [
              { name: "service.name" },
              { name: "count()" },
              { name: "countIf(has_error = true)" },
              { name: "p95(duration_nano)" },
            ],
            data: [
              ["point-api", 1000, 25, 250_000_000],
              ["point-worker", 200, 0, 1_500_000_000],
            ],
          },
        ],
      },
    });
  }
  if (body.requestType === "raw") {
    return envelope({
      type: "raw",
      data: {
        results: [{ queryName: "A", rows: [{ timestamp: "t", data: { name: "GET /x", duration_nano: 12_340_000 } }] }],
      },
    });
  }
  return envelope({
    type: "time_series",
    data: {
      results: [
        {
          queryName: "A",
          aggregations: [{ index: 0, series: [{ labels: [], values: [{ timestamp: 0, value: 2 }] }] }],
        },
      ],
    },
  });
}

function route(seen: Seen): Response {
  if (seen.path === "/api/v5/query_range") return queryRange(JSON.parse(seen.body) as RangeBody);
  if (seen.path === "/api/v2/dashboards" && seen.method === "POST") {
    const body = JSON.parse(seen.body) as Record<string, unknown>;
    const id = `d${dashboards.size + 1}`;
    dashboards.set(id, { id, ...body, locked: false, tags: body.tags });
    return envelope(dashboards.get(id), 201);
  }
  const match = /^\/api\/v2\/dashboards\/([^/]+)$/.exec(seen.path);
  if (match && seen.method === "GET") return envelope(dashboards.get(match[1]));
  if (match && seen.method === "PUT") {
    dashboards.set(match[1], { id: match[1], ...(JSON.parse(seen.body) as object) });
    return envelope(dashboards.get(match[1]));
  }
  if (seen.path === "/api/v4/traces/t1/waterfall") {
    return envelope({
      rootServiceName: "point-api",
      startTimestampMillis: 1000,
      endTimestampMillis: 1250,
      totalSpansCount: 2,
      totalErrorSpansCount: 1,
      spans: [
        {
          span_id: "s1",
          name: "GET /orders",
          service_name: "point-api",
          duration_nano: 250_000_000,
          level: 0,
          attributes: { "http.route": "/orders" },
        },
        {
          span_id: "s2",
          name: "SELECT",
          service_name: "point-api",
          duration_nano: 200_000_000,
          level: 1,
          has_error: true,
          events: [
            { name: "exception", attributeMap: { "exception.type": "Timeout", "exception.message": "db timeout" } },
          ],
        },
      ],
    });
  }
  return envelope({});
}

beforeEach(async () => {
  dashboards = new Map();
  signoz = await FakeSignoz.start((_req, seen) => route(seen));
  const server = buildSignozMcpServer(createSignozClient({ baseUrl: signoz.url, apiKey: "k" }), {
    environment: "production",
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
});
afterEach(async () => {
  await client.close();
  await signoz.stop();
});

// oxlint-disable-next-line typescript/no-explicit-any -- tool results are JSON the assertions walk freely
type Json = any;

async function call(
  name: string,
  args: Record<string, unknown>
): Promise<{ isError: boolean; text: string; json: () => Json }> {
  const result = await client.callTool({ name, arguments: args });
  const text = (result.content as { text: string }[]).map((part) => part.text).join("");
  return { isError: result.isError === true, text, json: () => JSON.parse(text) };
}

function ranges(): RangeBody[] {
  return signoz.seen.filter((s) => s.path === "/api/v5/query_range").map((s) => JSON.parse(s.body) as RangeBody);
}

describe("telemetry tools", () => {
  it("lists services with error rate and p95 in ms, in the configured environment", async () => {
    const result = await call("signoz_list_services", { since: "6h" });
    expect(result.isError).toBe(false);
    expect(result.json().services).toEqual([
      { service: "point-api", spans: 1000, errors: 25, errorRatePercent: 2.5, p95_ms: 250 },
      { service: "point-worker", spans: 200, errors: 0, errorRatePercent: 0, p95_ms: 1500 },
    ]);
    const [body] = ranges();
    expect(body.requestType).toBe("scalar");
    expect(body.compositeQuery.queries[0].spec.filter?.expression).toBe("deployment.environment = 'production'");
  });

  it("lifts the environment with 'all'", async () => {
    await call("signoz_list_services", { environment: "all" });
    expect(ranges()[0].compositeQuery.queries[0].spec.filter).toBeUndefined();
  });

  it("answers a trace as a compact waterfall with its exceptions", async () => {
    const result = await call("signoz_get_trace", { traceId: "t1" });
    expect(result.json()).toMatchObject({
      rootService: "point-api",
      duration_ms: 250,
      errorSpans: 1,
      spans: [
        { level: 0, name: "GET /orders", duration_ms: 250, attributes: { "http.route": "/orders" } },
        { level: 1, name: "SELECT", error: true, exceptions: [{ type: "Timeout", message: "db timeout" }] },
      ],
    });
  });

  it("runs free-form queries with formulas and a step", async () => {
    const result = await call("signoz_query", {
      since: "1h",
      queries: [
        { signal: "traces", aggregations: ["countIf(has_error = true)"], disabled: true },
        { signal: "traces", aggregations: ["count()"], disabled: true },
      ],
      formulas: [{ name: "F1", expression: "A / B * 100" }],
    });
    expect(result.isError).toBe(false);
    expect(result.json().stepSeconds).toBe(60);
    expect(ranges()[0].compositeQuery.queries.map((q) => q.type)).toEqual([
      "builder_query",
      "builder_query",
      "builder_formula",
    ]);
  });

  it("returns SigNoz's own message for a bad query", async () => {
    const result = await call("signoz_query", {
      queries: [{ signal: "logs", aggregations: ["count()"], filter: "bogus = 1" }],
    });
    expect(result.isError).toBe(true);
    expect(result.text).toContain("SigNoz answered 400");
    expect(result.text).toContain("key `bogus` not found");
  });
});

describe("dashboard tools", () => {
  const point = {
    title: "Point — production",
    presets: [
      { preset: "api_red", service: "point-api" },
      { preset: "worker_failures", service: "point-worker" },
    ],
  };

  it("checks every panel, creates the dashboard and answers its link", async () => {
    const result = await call("signoz_create_dashboard", point);
    expect(result.isError).toBe(false);
    const answer = result.json();
    expect(answer).toMatchObject({
      saved: true,
      id: "d1",
      url: `${signoz.url}/dashboard/d1`,
      title: "Point — production",
    });
    expect(ranges()).toHaveLength(answer.panels.length);
    const created = dashboards.get("d1") as { schemaVersion: string; name: string };
    expect(created.schemaVersion).toBe("v6");
    expect(created.name).toBe("point-production");
  });

  it("saves nothing when a panel's query fails, and names the panel", async () => {
    const result = await call("signoz_create_dashboard", {
      title: "Broken",
      sections: [
        {
          panels: [
            { title: "Good", kind: "number", queries: [{ signal: "traces", aggregations: ["count()"] }] },
            {
              title: "Bad",
              kind: "timeseries",
              queries: [{ signal: "logs", aggregations: ["count()"], filter: "bogus = 1" }],
            },
          ],
        },
      ],
    });
    expect(result.isError).toBe(false);
    expect(result.json()).toMatchObject({
      saved: false,
      failedPanels: [{ title: "Bad", ok: false, error: expect.stringContaining("key `bogus` not found") }],
    });
    expect(dashboards.size).toBe(0);
  });

  it("answers the body without saving on dryRun, and skips the check with validate none", async () => {
    const result = await call("signoz_create_dashboard", { ...point, dryRun: true, validate: "none" });
    expect(result.json()).toMatchObject({ saved: false, dryRun: true, body: { schemaVersion: "v6" } });
    expect(ranges()).toHaveLength(0);
    expect(dashboards.size).toBe(0);
  });

  it("appends sections to an existing dashboard, keeping its panels", async () => {
    await call("signoz_create_dashboard", { ...point, validate: "none" });
    const before = Object.keys((dashboards.get("d1") as { spec: { panels: object } }).spec.panels);
    const result = await call("signoz_update_dashboard", {
      id: "d1",
      presets: [{ preset: "logs_errors", service: "point-api" }],
      validate: "none",
    });
    expect(result.json()).toMatchObject({ saved: true, mode: "append", url: `${signoz.url}/dashboard/d1` });
    const after = dashboards.get("d1") as { spec: { panels: object; layouts: unknown[] }; schemaVersion: string };
    expect(Object.keys(after.spec.panels)).toEqual(expect.arrayContaining(before));
    expect(Object.keys(after.spec.panels).length).toBeGreaterThan(before.length);
    expect(after.spec.layouts).toHaveLength(3);
    expect(after.schemaVersion).toBe("v6");
  });

  it("summarises a dashboard's sections and panels", async () => {
    await call("signoz_create_dashboard", { ...point, validate: "none" });
    const summary = (await call("signoz_get_dashboard", { id: "d1" })).json();
    expect(summary.url).toBe(`${signoz.url}/dashboard/d1`);
    expect(summary.sections[0].panels[0]).toMatchObject({ key: "requests", title: "Requests", kind: "Number" });
  });

  it("previews one panel against live data", async () => {
    const result = await call("signoz_preview_panel", {
      panel: { title: "Latest errors", kind: "list", queries: [{ signal: "traces", filter: "has_error = true" }] },
    });
    expect(result.json()).toMatchObject({ requestType: "raw", results: [{ count: 1 }] });
  });

  it("publishes only with confirm", async () => {
    const refused = await call("signoz_share_dashboard", { id: "d1" });
    expect(refused.isError).toBe(true);
    expect(refused.text).toContain("confirm: true");
    expect(signoz.seen).toEqual([]);
  });
});
