import {
  type DashboardInput,
  GRID_COLUMNS,
  buildDashboard,
  buildSections,
  packGrid,
  panelQuery,
  sectionsOf,
  slugify,
} from "../../../src/mcp/query/dashboard";

/**
 * The rules SigNoz v0.142.1 applies to a dashboard on write (`pkg/types/dashboardtypes`,
 * `perses_dashboard_data.go` and `perses_replicas.go`), checked here on every body the builder
 * produces so a violation fails before a live instance would refuse it.
 */
function serverRules(body: ReturnType<typeof buildDashboard>["body"]): string[] {
  const problems: string[] = [];
  if (body.schemaVersion !== "v6") problems.push(`schemaVersion ${body.schemaVersion}`);
  if (!/^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/.test(body.name ?? ""))
    problems.push(`name '${body.name}' is not DNS-1123`);
  const { spec } = body;
  if (!spec.display.name) problems.push("spec.display.name is empty");
  if (!Array.isArray(spec.variables)) problems.push("spec.variables is not an array");
  const allowed: Record<string, string[]> = {
    "signoz/TimeSeriesPanel": ["signoz/BuilderQuery", "signoz/CompositeQuery", "signoz/PromQLQuery"],
    "signoz/BarChartPanel": ["signoz/BuilderQuery", "signoz/CompositeQuery", "signoz/PromQLQuery"],
    "signoz/NumberPanel": ["signoz/BuilderQuery", "signoz/CompositeQuery", "signoz/PromQLQuery"],
    "signoz/TablePanel": ["signoz/BuilderQuery", "signoz/CompositeQuery"],
    "signoz/PieChartPanel": ["signoz/BuilderQuery", "signoz/CompositeQuery"],
    "signoz/ListPanel": ["signoz/BuilderQuery"],
    "signoz/TextPanel": [],
  };
  for (const [key, panel] of Object.entries(spec.panels)) {
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) problems.push(`panel key ${key}`);
    if (!panel.spec.display.name) problems.push(`${key}: no display name`);
    const kind = String(panel.spec.plugin.kind);
    const queries = panel.spec.queries;
    if (kind === "signoz/TextPanel") {
      if (queries.length !== 0) problems.push(`${key}: text panel with queries`);
      continue;
    }
    if (queries.length !== 1) problems.push(`${key}: ${queries.length} queries`);
    for (const query of queries) {
      const plugin = query.spec.plugin as {
        kind: string;
        spec: {
          queries?: { spec: { aggregations?: { expression?: string }[] } }[];
          aggregations?: { expression?: string }[];
        };
      };
      if (!allowed[kind]?.includes(plugin.kind)) problems.push(`${key}: ${plugin.kind} on ${kind}`);
      const subs =
        plugin.kind === "signoz/CompositeQuery" ? (plugin.spec.queries ?? []).map((q) => q.spec) : [plugin.spec];
      for (const sub of subs) {
        for (const aggregation of sub.aggregations ?? []) {
          if (aggregation.expression && /\)\s*,\s*\w+\(/.test(aggregation.expression)) {
            problems.push(`${key}: packed aggregation ${aggregation.expression}`);
          }
        }
      }
      const expected =
        kind === "signoz/ListPanel"
          ? "raw"
          : ["signoz/NumberPanel", "signoz/TablePanel", "signoz/PieChartPanel"].includes(kind)
            ? "scalar"
            : "time_series";
      if (query.kind !== expected) problems.push(`${key}: request type ${query.kind}, expected ${expected}`);
    }
  }
  const placed = new Set<string>();
  for (const [li, layout] of spec.layouts.entries()) {
    const grid = layout.spec as {
      display?: { title?: string };
      items?: { x?: number; y?: number; width?: number; height?: number; content?: { $ref?: string } }[] | null;
    };
    if ((grid.display?.title ?? "").length > 200) problems.push(`layout ${li}: title too long`);
    const items = grid.items ?? [];
    if (items.length > 100) problems.push(`layout ${li}: ${items.length} items`);
    for (const [ii, item] of items.entries()) {
      const { x = 0, y = 0, width = 0, height = 0 } = item;
      if (width < 1 || height < 1 || x < 0 || y < 0 || width > GRID_COLUMNS || x + width > GRID_COLUMNS) {
        problems.push(`layout ${li} item ${ii}: geometry ${x},${y} ${width}x${height}`);
      }
      const match = /^#\/spec\/panels\/(.+)$/.exec(item.content?.$ref ?? "");
      if (!match || !spec.panels[match[1]]) problems.push(`layout ${li} item ${ii}: bad ref ${item.content?.$ref}`);
      else if (placed.has(match[1])) problems.push(`panel ${match[1]} placed twice`);
      else placed.add(match[1]);
      for (const other of items.slice(ii + 1)) {
        const b = { x: other.x ?? 0, y: other.y ?? 0, w: other.width ?? 0, h: other.height ?? 0 };
        if (x < b.x + b.w && b.x < x + width && y < b.y + b.h && b.y < y + height)
          problems.push(`layout ${li}: overlap at item ${ii}`);
      }
    }
  }
  return problems;
}

const POINT: DashboardInput = {
  title: "Point — API and workers (production)",
  tags: ["team:point", "production"],
  presets: [
    { preset: "api_red", service: "point-api" },
    { preset: "worker_failures", service: "point-worker", filter: "name LIKE 'job.%'" },
    { preset: "logs_errors", service: "point-api" },
  ],
  sections: [
    {
      title: "Notes",
      panels: [
        { title: "How to read", kind: "text", text: "Click a point → View traces / View logs." },
        {
          title: "Requests by route",
          kind: "pie",
          queries: [
            {
              signal: "traces",
              aggregations: ["count()"],
              groupBy: ["http.route"],
              filter: "service.name = 'point-api'",
            },
          ],
        },
      ],
    },
  ],
};

describe("buildDashboard", () => {
  it("builds a v6 body that passes every rule SigNoz checks on write", () => {
    const { body, panels } = buildDashboard(POINT, "production");
    expect(serverRules(body)).toEqual([]);
    expect(body.name).toBe("point-api-and-workers-production");
    expect(body.tags).toEqual([
      { key: "team", value: "point" },
      { key: "tag", value: "production" },
    ]);
    expect(Object.keys(body.spec.panels)).toHaveLength(panels.length);
    expect(body.spec.layouts.map((l) => (l.spec as { display?: { title?: string } }).display?.title)).toEqual([
      "API point-api — volume, latency, errors",
      "Workers point-worker — jobs and failures",
      "Logs point-api — errors",
      "Notes",
    ]);
  });

  it("filters every preset on the service, the environment and the preset's own filter", () => {
    const { body } = buildDashboard(POINT, "production");
    const json = JSON.stringify(body.spec.panels);
    expect(json).toContain(
      "service.name = 'point-api' AND deployment.environment = 'production' AND kind_string = 'Server'"
    );
    expect(json).toContain(
      "service.name = 'point-worker' AND deployment.environment = 'production' AND name LIKE 'job.%'"
    );
    const noEnv = JSON.stringify(
      buildDashboard({ ...POINT, presets: [{ preset: "api_red", service: "a", environment: "all" }] }).body
    );
    expect(noEnv).not.toContain("deployment.environment");
  });

  it("computes the error rate as a composite of two hidden queries and a formula", () => {
    const panel = buildDashboard(POINT).body.spec.panels["error-rate"];
    expect(panel.spec.queries[0].spec.plugin).toEqual({
      kind: "signoz/CompositeQuery",
      spec: {
        queries: [
          {
            type: "builder_query",
            spec: expect.objectContaining({
              name: "A",
              disabled: true,
              aggregations: [{ expression: "countIf(has_error = true)" }],
            }),
          },
          {
            type: "builder_query",
            spec: expect.objectContaining({ name: "B", disabled: true, aggregations: [{ expression: "count()" }] }),
          },
          { type: "builder_formula", spec: { name: "F1", expression: "A / B * 100", legend: "error %" } },
        ],
      },
    });
  });

  it("keeps panel keys unique, also against the keys of a dashboard being extended", () => {
    const sections = sectionsOf({
      sections: [
        {
          panels: [
            { title: "Errors", kind: "text" },
            { title: "Errors", kind: "text" },
          ],
        },
      ],
    });
    expect(buildSections(sections, ["errors"]).built.map((p) => p.key)).toEqual(["errors-2", "errors-3"]);
  });

  it("refuses panels SigNoz would refuse, before calling it", () => {
    expect(() =>
      panelQuery({ title: "t", kind: "list", queries: [{ signal: "logs", aggregations: ["count()"] }] })
    ).toThrow("list panel shows raw rows");
    expect(() => panelQuery({ title: "t", kind: "text", promql: "up" })).toThrow("takes no query");
    expect(() => panelQuery({ title: "t", kind: "table", promql: "up" })).toThrow("cannot run PromQL");
    expect(() => panelQuery({ title: "t", kind: "number", queries: [{ signal: "traces" }] })).toThrow(
      "needs aggregations"
    );
    expect(() => panelQuery({ title: "t", kind: "number" })).toThrow("needs queries");
    expect(() => sectionsOf({})).toThrow("has no panels");
  });

  it("slugifies titles into DNS-1123 labels", () => {
    expect(slugify("Point — API (Produção) ")).toBe("point-api-producao");
    expect(slugify("***")).toBe("dashboard");
    expect(slugify("x".repeat(80))).toHaveLength(63);
  });

  it("packs a grid row by row without overlaps", () => {
    expect(
      packGrid([
        { width: 3, height: 3 },
        { width: 6, height: 6 },
        { width: 6, height: 6 },
        { width: 12, height: 2 },
      ])
    ).toEqual([
      { x: 0, y: 0, width: 3, height: 3 },
      { x: 3, y: 0, width: 6, height: 6 },
      { x: 0, y: 6, width: 6, height: 6 },
      { x: 0, y: 12, width: 12, height: 2 },
    ]);
  });
});
