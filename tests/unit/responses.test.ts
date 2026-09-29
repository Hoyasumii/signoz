import { createSignozClient, SignozApiError } from "../../src/index";
import { envelope, FakeSignoz, type Handler, json, renderError } from "./fake-server";

let server: FakeSignoz | undefined;
afterEach(async () => server?.stop());

const SECRET_ACCESS = "access-secret-123";
const SECRET_REFRESH = "refresh-secret-456";

async function client(handler: Handler) {
  server = await FakeSignoz.start(handler);
  return createSignozClient({ baseUrl: server.url, authToken: SECRET_ACCESS, refreshAuthToken: SECRET_REFRESH });
}

describe("response modes", () => {
  test("envelope → returns data", async () => {
    const c = await client(() => envelope({ dashboards: [{ id: "d1" }], total: 1 }));
    const result = await c.dashboard.listDashboardsV2({ query: { limit: 10, order: "desc" } });
    expect(result).toEqual({ dashboards: [{ id: "d1" }], total: 1 } as never);
    expect(server?.seen[0]?.search).toBe("?limit=10&order=desc");
  });

  test("204 → undefined, with an encoded path param", async () => {
    const c = await client(() => new Response(null, { status: 204 }));
    const result = await c.dashboard.deleteDashboardV2({ path: { id: "a/b c" } });
    expect(result).toBeUndefined();
    expect(server?.seen[0]).toMatchObject({ method: "DELETE", path: "/api/v2/dashboards/a%2Fb%20c" });
  });

  test("2xx without content in the spec and a {status:success} body → undefined", async () => {
    const c = await client(() => json({ status: "success" }, 201));
    const result = await c.logs.handlePromoteAndIndexPaths({ body: [] as never });
    expect(result).toBeUndefined();
  });

  test("export_raw_data → streamed Response (CSV)", async () => {
    const csv = "timestamp,body\n1,hello\n2,world\n";
    const c = await client(
      () =>
        new Response(csv, {
          headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="data.csv"' },
        })
    );
    const res = await c.logs.handleExportRawDataPOST({ query: { format: "csv" } });
    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get("content-type")).toBe("text/csv");
    expect(await res.text()).toBe(csv);
    expect(typeof c.traces.handleExportRawDataPOST).toBe("function"); // alias on the second tag
  });

  test("Prometheus: success returns the whole object (with warnings)", async () => {
    const body = { status: "success", data: { resultType: "vector", result: [] }, warnings: ["w1"], infos: [] };
    const c = await client(() => json(body));
    const result = await c.prometheus.prometheusQuery({ query: { query: "up" } as never });
    expect(result).toEqual(body as never);
  });

  test("Prometheus: an error becomes a SignozApiError with errorType/error", async () => {
    const c = await client(() => json({ status: "error", errorType: "bad_data", error: "parse error at char 3" }, 400));
    const err = await c.prometheus.prometheusQuery({ query: { query: "up{" } as never }).catch((e) => e);
    expect(err).toBeInstanceOf(SignozApiError);
    expect(err).toMatchObject({ status: 400, code: "bad_data" });
    expect(err.message).toContain("parse error at char 3");
  });

  test("standard error → SignozApiError with code, type and message", async () => {
    const c = await client(() => renderError(403, "forbidden", "role EDITOR required", "forbidden"));
    const err = await c.dashboard.deleteDashboardV2({ path: { id: "d1" } }).catch((e) => e);
    expect(err).toBeInstanceOf(SignozApiError);
    expect(err).toMatchObject({ status: 403, code: "forbidden", type: "forbidden", operationId: "DeleteDashboardV2" });
    expect(err.message).toContain("role EDITOR required");
  });

  test("{ raw: true } returns the Response on an envelope operation", async () => {
    const c = await client(() => envelope({ id: "u1" }));
    const res = await c.users.getMyUser({ raw: true });
    expect(res).toBeInstanceOf(Response);
    expect(await res.json()).toEqual({ status: "success", data: { id: "u1" } });
  });

  test("SAML callback: form-urlencoded body and manual redirect", async () => {
    const c = await client(() => new Response(null, { status: 303, headers: { Location: "/home" } }));
    const res = await c.sessions.createSessionBySAMLCallback({
      body: { SAMLResponse: "PHNhbWw+", RelayState: "state-1" },
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/home");
    expect(server?.seen).toHaveLength(1); // did not follow the redirect
    expect(server?.seen[0]?.contentType).toBe("application/x-www-form-urlencoded");
    expect(server?.seen[0]?.body).toBe("SAMLResponse=PHNhbWw%2B&RelayState=state-1");
  });

  test("generic request() for a route outside the spec", async () => {
    const c = await client(() => envelope([{ id: 1 }]));
    const result = await c.request<{ id: number }[]>("GET", "/api/v1/legacy", { query: { a: 1 } });
    expect(result).toEqual([{ id: 1 }]);
    expect(server?.seen[0]).toMatchObject({
      path: "/api/v1/legacy",
      search: "?a=1",
      authorization: `Bearer ${SECRET_ACCESS}`,
    });
  });
});

describe("tokens never leak in an error", () => {
  test("masks tokens echoed in the body, the message and String(err)", async () => {
    const c = await client(() =>
      json(
        {
          status: "error",
          error: { code: "x", message: `token ${SECRET_ACCESS} invalid`, type: "invalid-input" },
          accessToken: SECRET_ACCESS,
          nested: { refreshToken: "other-refresh", echo: `Bearer ${SECRET_REFRESH}` },
        },
        400
      )
    );
    const err = await c.users.getMyUser().catch((e) => e);
    const dump = [err.message, String(err), JSON.stringify(err.body), JSON.stringify(err), err.stack].join("\n");
    expect(dump).not.toContain(SECRET_ACCESS);
    expect(dump).not.toContain(SECRET_REFRESH);
    expect(dump).not.toContain("other-refresh");
    expect(err.message).toContain("token *** invalid");
  });
});
