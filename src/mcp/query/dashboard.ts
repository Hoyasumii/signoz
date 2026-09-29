import { z } from "zod";
import type { components } from "../../generated/schema";
import { ToolInputError } from "../catalog";
import {
  type BuilderQueryInput,
  type FormulaInput,
  type RequestType,
  andFilter,
  builderQuerySchema,
  builderSpec,
  envelopes,
  environmentFilter,
  formulaSchema,
  quoteValue,
} from "./v5";

type Schemas = components["schemas"];
export type PostableDashboard = Schemas["DashboardtypesPostableDashboardV2"];
export type DashboardSpec = Schemas["DashboardtypesDashboardSpec"];
type Panel = Schemas["DashboardtypesPanel"];
type PanelQuery = Schemas["DashboardtypesQuery"];
type GridItem = Schemas["DashboardGridItem"];
type Layout = Schemas["DashboardtypesLayout"];

/** The dashboard schema version SigNoz v0.142.1 accepts (`dashboardtypes.SchemaVersion`). */
export const DASHBOARD_SCHEMA_VERSION = "v6";
/** Grid columns (`gridColumnCount` in SigNoz). */
export const GRID_COLUMNS = 12;

const PANEL_KINDS = ["timeseries", "bar", "number", "table", "pie", "list", "text"] as const;
export type PanelKind = (typeof PANEL_KINDS)[number];

/** The request type each panel kind runs its query as. */
export const REQUEST_TYPE: Record<Exclude<PanelKind, "text">, RequestType> = {
  timeseries: "time_series",
  bar: "time_series",
  number: "scalar",
  table: "scalar",
  pie: "scalar",
  list: "raw",
};

const DEFAULT_SIZE: Record<PanelKind, { width: number; height: number }> = {
  timeseries: { width: 6, height: 6 },
  bar: { width: 6, height: 6 },
  number: { width: 3, height: 3 },
  table: { width: 12, height: 6 },
  pie: { width: 4, height: 6 },
  list: { width: 12, height: 8 },
  text: { width: 12, height: 2 },
};

export const panelSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().optional(),
  kind: z
    .enum(PANEL_KINDS)
    .describe(
      "timeseries/bar: a value over time. number: one value for the range. table/pie: grouped values. " +
        "list: raw log lines or spans (one builder query, no aggregations). text: markdown."
    ),
  queries: z
    .array(builderQuerySchema)
    .optional()
    .describe("Builder queries (A, B, …). Several queries, or any formula, make a composite query."),
  formulas: z.array(formulaSchema).optional().describe("e.g. [{name: 'F1', expression: 'A / B * 100'}]"),
  promql: z.string().optional().describe("A PromQL query instead of builder queries."),
  text: z.string().optional().describe("Markdown for a text panel."),
  unit: z.string().optional().describe("Display unit: 'ns', 'ms', 's', 'percent', 'reqps', 'short', 'bytes'…"),
  thresholds: z
    .array(z.object({ value: z.number(), color: z.string(), label: z.string().optional() }))
    .optional()
    .describe("Lines (timeseries/bar) or colour rules (number, above the value)."),
  width: z.number().int().min(1).max(GRID_COLUMNS).optional().describe(`Columns out of ${GRID_COLUMNS}.`),
  height: z.number().int().min(1).max(40).optional(),
});
export type PanelInput = z.infer<typeof panelSchema>;

export const presetSchema = z.discriminatedUnion("preset", [
  z.object({
    preset: z.literal("api_red"),
    service: z.string().describe("service.name of the API, e.g. 'point-api'."),
    environment: z.string().optional().describe("deployment.environment; default: the configured one. 'all' for none."),
    filter: z
      .string()
      .optional()
      .describe("Which spans are requests. Default: \"kind_string = 'Server'\" (entry spans of the service)."),
    routeAttribute: z.string().optional().describe("Attribute naming the endpoint. Default 'http.route'."),
    title: z.string().optional(),
  }),
  z.object({
    preset: z.literal("worker_failures"),
    service: z.string().describe("service.name of the worker(s), e.g. 'point-worker'."),
    environment: z.string().optional(),
    filter: z
      .string()
      .optional()
      .describe(
        "Which spans are job runs, e.g. \"name LIKE 'job.%'\" or \"kind_string = 'Consumer'\". Default: all spans."
      ),
    jobAttribute: z.string().optional().describe("Attribute naming the job. Default 'name' (the span name)."),
    title: z.string().optional(),
  }),
  z.object({
    preset: z.literal("logs_errors"),
    service: z.string().describe("service.name whose logs to watch."),
    environment: z.string().optional(),
    filter: z.string().optional().describe("Extra filter on the logs."),
    title: z.string().optional(),
  }),
]);
export type PresetInput = z.infer<typeof presetSchema>;

export const sectionSchema = z.object({
  title: z.string().max(80).optional().describe("Row title; the section is collapsible in SigNoz."),
  panels: z.array(panelSchema).min(1),
});
export type SectionInput = z.infer<typeof sectionSchema>;

export const dashboardInputShape = {
  title: z.string().min(1).max(120).describe("Display name, e.g. 'Point — API and workers (production)'."),
  name: z
    .string()
    .regex(/^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/)
    .optional()
    .describe("Slug (lowercase, digits and '-', at most 63). Default: derived from the title."),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().describe("Tags as 'key:value' (or a bare word, stored as tag:<word>)."),
  presets: z
    .array(presetSchema)
    .optional()
    .describe("Ready-made sections: api_red (volume, latency, errors), worker_failures, logs_errors."),
  sections: z.array(sectionSchema).optional().describe("Your own sections of panels, after the presets."),
};
export const dashboardInputSchema = z.object(dashboardInputShape);
export type DashboardInput = z.infer<typeof dashboardInputSchema>;

/** A DNS-1123 label from a title: lowercase ASCII, digits and single hyphens, at most 63. */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "");
  return slug || "dashboard";
}

function tagsOf(tags: string[] | undefined): Schemas["TagtypesPostableTag"][] {
  return (tags ?? []).map((tag) => {
    const at = tag.indexOf(":");
    return at > 0
      ? { key: tag.slice(0, at).trim(), value: tag.slice(at + 1).trim() }
      : { key: "tag", value: tag.trim() };
  });
}

/** The one query a panel carries: a builder query, a composite of several (with formulas), or PromQL. */
export function panelQuery(panel: PanelInput): PanelQuery | undefined {
  if (panel.kind === "text") {
    if (panel.queries?.length || panel.promql)
      throw new ToolInputError(`Panel '${panel.title}': a text panel takes no query.`);
    return undefined;
  }
  const kind = REQUEST_TYPE[panel.kind];
  const queries = panel.queries ?? [];
  const formulas = panel.formulas ?? [];
  if (panel.promql) {
    if (queries.length > 0) throw new ToolInputError(`Panel '${panel.title}': use either promql or queries, not both.`);
    if (panel.kind === "list" || panel.kind === "table" || panel.kind === "pie") {
      throw new ToolInputError(`Panel '${panel.title}': a ${panel.kind} panel cannot run PromQL.`);
    }
    return {
      kind,
      spec: { name: "A", plugin: { kind: "signoz/PromQLQuery", spec: { name: "A", query: panel.promql } } },
    };
  }
  if (queries.length === 0) throw new ToolInputError(`Panel '${panel.title}': it needs queries (or promql).`);
  if (panel.kind === "list") {
    if (queries.length !== 1 || formulas.length > 0) {
      throw new ToolInputError(`Panel '${panel.title}': a list panel takes exactly one builder query and no formula.`);
    }
    if (queries[0].aggregations?.length) {
      throw new ToolInputError(`Panel '${panel.title}': a list panel shows raw rows; drop the aggregations.`);
    }
  } else {
    for (const [i, query] of queries.entries()) {
      if (query.signal !== "metrics" && !query.aggregations?.length) {
        throw new ToolInputError(
          `Panel '${panel.title}', query ${query.name ?? i}: it needs aggregations, e.g. ['count()'].`
        );
      }
    }
  }
  if (queries.length === 1 && formulas.length === 0) {
    const spec = builderSpec(queries[0], 0);
    return {
      kind,
      spec: { name: String(spec.name), plugin: { kind: "signoz/BuilderQuery", spec } },
    };
  }
  return {
    kind,
    spec: {
      name: "composite",
      plugin: { kind: "signoz/CompositeQuery", spec: { queries: envelopes(queries, formulas) } },
    },
  };
}

function pluginFor(panel: PanelInput): Schemas["DashboardtypesPanelPlugin"] {
  const formatting = panel.unit ? { unit: panel.unit } : undefined;
  const visualization = { timePreference: "global_time" as const };
  const lineThresholds = panel.thresholds?.map((t) => ({
    value: t.value,
    color: t.color,
    ...(t.label ? { label: t.label } : {}),
  }));
  switch (panel.kind) {
    case "timeseries":
      return {
        kind: "signoz/TimeSeriesPanel",
        spec: { formatting, visualization, legend: { position: "bottom" }, thresholds: lineThresholds },
      };
    case "bar":
      return {
        kind: "signoz/BarChartPanel",
        spec: { formatting, visualization, legend: { position: "bottom" }, thresholds: lineThresholds },
      };
    case "number":
      return {
        kind: "signoz/NumberPanel",
        spec: {
          formatting: { ...formatting, decimalPrecision: "2" },
          visualization,
          thresholds: panel.thresholds?.map((t) => ({ value: t.value, color: t.color, operator: "above" as const })),
        },
      };
    case "table":
      return { kind: "signoz/TablePanel", spec: { visualization } };
    case "pie":
      return { kind: "signoz/PieChartPanel", spec: { formatting, visualization, legend: { position: "right" } } };
    case "list":
      return {
        kind: "signoz/ListPanel",
        spec: { selectFields: (panel.queries?.[0]?.selectFields ?? []).map((name) => ({ name })) },
      };
    case "text":
      return { kind: "signoz/TextPanel", spec: { mode: "markdown", text: panel.text ?? panel.description ?? "" } };
  }
}

function buildPanel(panel: PanelInput): Panel {
  const query = panelQuery(panel);
  return {
    kind: "Panel",
    spec: {
      display: { name: panel.title, ...(panel.description ? { description: panel.description } : {}) },
      plugin: pluginFor(panel),
      queries: query ? [query] : [],
    },
  };
}

/** Row-packs panels into a grid of {@link GRID_COLUMNS} columns, left to right, top to bottom. */
export function packGrid(
  sizes: { width: number; height: number }[]
): { x: number; y: number; width: number; height: number }[] {
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  return sizes.map(({ width, height }) => {
    if (x + width > GRID_COLUMNS) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    const placed = { x, y, width, height };
    x += width;
    rowHeight = Math.max(rowHeight, height);
    return placed;
  });
}

// ---- presets -----------------------------------------------------------------------------------

/**
 * RED metrics of an HTTP API from its server spans: volume, errors and latency, then the endpoints
 * that fail most, then the latest failing requests. Every panel is a traces builder query, so a
 * click on a point opens "View traces" in SigNoz for that interval.
 */
function apiRed(p: Extract<PresetInput, { preset: "api_red" }>, environment?: string): SectionInput {
  const env = environmentFilter(p.environment ?? environment);
  const base = andFilter(`service.name = ${quoteValue(p.service)}`, env, p.filter ?? "kind_string = 'Server'");
  const route = p.routeAttribute ?? "http.route";
  const errors = andFilter(base, "has_error = true");
  const errorRate = (title: string, kind: "number" | "timeseries"): PanelInput => ({
    title,
    kind,
    unit: "percent",
    queries: [
      { name: "A", signal: "traces", aggregations: ["countIf(has_error = true)"], filter: base, disabled: true },
      { name: "B", signal: "traces", aggregations: ["count()"], filter: base, disabled: true },
    ],
    formulas: [{ name: "F1", expression: "A / B * 100", legend: "error %" }],
    thresholds: [{ value: 5, color: "red", label: "5%" }],
  });
  return {
    title: p.title ?? `API ${p.service} — volume, latency, errors`,
    panels: [
      {
        title: "Requests",
        kind: "number",
        unit: "short",
        queries: [{ signal: "traces", aggregations: ["count()"], filter: base }],
      },
      errorRate("Error rate", "number"),
      {
        title: "Latency p95",
        kind: "number",
        unit: "ns",
        queries: [{ signal: "traces", aggregations: ["p95(duration_nano)"], filter: base }],
      },
      {
        title: "Failed requests",
        kind: "number",
        unit: "short",
        queries: [{ signal: "traces", aggregations: ["count()"], filter: errors }],
      },
      {
        title: "Requests per second",
        kind: "timeseries",
        unit: "reqps",
        queries: [{ signal: "traces", aggregations: ["rate()"], filter: base, legend: "req/s" }],
      },
      errorRate("Error rate over time", "timeseries"),
      {
        title: "Latency p50 / p95 / p99",
        kind: "timeseries",
        unit: "ns",
        queries: [
          {
            signal: "traces",
            aggregations: ["p50(duration_nano)", "p95(duration_nano)", "p99(duration_nano)"],
            filter: base,
          },
        ],
      },
      {
        title: "Requests by status (errors vs ok)",
        kind: "bar",
        unit: "short",
        queries: [
          {
            signal: "traces",
            aggregations: ["count()"],
            filter: base,
            groupBy: ["has_error"],
            legend: "error={{has_error}}",
          },
        ],
      },
      {
        title: `Endpoints by errors (${route})`,
        kind: "table",
        queries: [
          {
            signal: "traces",
            aggregations: ["countIf(has_error = true)", "count()", "p95(duration_nano)"],
            filter: base,
            groupBy: [route],
            orderBy: [{ key: "countIf(has_error = true)", direction: "desc" }],
            limit: 20,
          },
        ],
      },
      {
        title: "Latest failed requests",
        kind: "list",
        queries: [
          {
            signal: "traces",
            filter: errors,
            orderBy: [{ key: "timestamp", direction: "desc" }],
            limit: 50,
            selectFields: ["name", route, "duration_nano", "trace_id"],
          },
        ],
      },
    ],
  };
}

/** Job runs and failures of background workers, from their spans, plus their error logs. */
function workerFailures(p: Extract<PresetInput, { preset: "worker_failures" }>, environment?: string): SectionInput {
  const env = environmentFilter(p.environment ?? environment);
  const base = andFilter(`service.name = ${quoteValue(p.service)}`, env, p.filter);
  const failed = andFilter(base, "has_error = true");
  const job = p.jobAttribute ?? "name";
  const logs = andFilter(`service.name = ${quoteValue(p.service)}`, env, "severity_text IN ('ERROR', 'FATAL')");
  return {
    title: p.title ?? `Workers ${p.service} — jobs and failures`,
    panels: [
      {
        title: "Job runs",
        kind: "number",
        unit: "short",
        queries: [{ signal: "traces", aggregations: ["count()"], filter: base }],
      },
      {
        title: "Failed job runs",
        kind: "number",
        unit: "short",
        queries: [{ signal: "traces", aggregations: ["count()"], filter: failed }],
        thresholds: [{ value: 0, color: "red" }],
      },
      {
        title: "Error logs",
        kind: "number",
        unit: "short",
        queries: [{ signal: "logs", aggregations: ["count()"], filter: logs }],
      },
      {
        title: "Job duration p95",
        kind: "number",
        unit: "ns",
        queries: [{ signal: "traces", aggregations: ["p95(duration_nano)"], filter: base }],
      },
      {
        title: "Failures by job",
        kind: "timeseries",
        unit: "short",
        queries: [
          { signal: "traces", aggregations: ["count()"], filter: failed, groupBy: [job], legend: `{{${job}}}` },
        ],
      },
      {
        title: "Runs by job",
        kind: "timeseries",
        unit: "short",
        queries: [{ signal: "traces", aggregations: ["count()"], filter: base, groupBy: [job], legend: `{{${job}}}` }],
      },
      {
        title: "Jobs: runs, failures, p95",
        kind: "table",
        queries: [
          {
            signal: "traces",
            aggregations: ["count()", "countIf(has_error = true)", "p95(duration_nano)"],
            filter: base,
            groupBy: [job],
            orderBy: [{ key: "countIf(has_error = true)", direction: "desc" }],
            limit: 50,
          },
        ],
      },
      {
        title: "Latest failed job runs",
        kind: "list",
        queries: [
          {
            signal: "traces",
            filter: failed,
            orderBy: [{ key: "timestamp", direction: "desc" }],
            limit: 50,
            selectFields: [job, "duration_nano", "trace_id"],
          },
        ],
      },
      {
        title: "Latest error logs",
        kind: "list",
        queries: [
          {
            signal: "logs",
            filter: logs,
            orderBy: [{ key: "timestamp", direction: "desc" }],
            limit: 50,
            selectFields: ["body"],
          },
        ],
      },
    ],
  };
}

/** Error and fatal logs of a service: their rate by severity and the latest lines. */
function logsErrors(p: Extract<PresetInput, { preset: "logs_errors" }>, environment?: string): SectionInput {
  const env = environmentFilter(p.environment ?? environment);
  const filter = andFilter(
    `service.name = ${quoteValue(p.service)}`,
    env,
    "severity_text IN ('ERROR', 'FATAL')",
    p.filter
  );
  return {
    title: p.title ?? `Logs ${p.service} — errors`,
    panels: [
      {
        title: "Error logs by severity",
        kind: "timeseries",
        unit: "short",
        width: 12,
        queries: [
          {
            signal: "logs",
            aggregations: ["count()"],
            filter,
            groupBy: ["severity_text"],
            legend: "{{severity_text}}",
          },
        ],
      },
      {
        title: "Latest error logs",
        kind: "list",
        queries: [
          {
            signal: "logs",
            filter,
            orderBy: [{ key: "timestamp", direction: "desc" }],
            limit: 100,
            selectFields: ["body"],
          },
        ],
      },
    ],
  };
}

export function expandPreset(preset: PresetInput, environment?: string): SectionInput {
  switch (preset.preset) {
    case "api_red":
      return apiRed(preset, environment);
    case "worker_failures":
      return workerFailures(preset, environment);
    case "logs_errors":
      return logsErrors(preset, environment);
  }
}

// ---- assembly ----------------------------------------------------------------------------------

export interface BuiltPanel {
  key: string;
  section: string;
  panel: PanelInput;
}

export interface BuiltDashboard {
  body: PostableDashboard;
  panels: BuiltPanel[];
}

/** The sections a dashboard input asks for: presets first, then its own. */
export function sectionsOf(input: Pick<DashboardInput, "presets" | "sections">, environment?: string): SectionInput[] {
  const sections = [...(input.presets ?? []).map((p) => expandPreset(p, environment)), ...(input.sections ?? [])];
  if (sections.length === 0) throw new ToolInputError("The dashboard has no panels: give presets and/or sections.");
  return sections;
}

/**
 * The layouts and panels for a list of sections, one Grid layout per section. `taken` holds panel
 * keys already used (when appending to an existing dashboard).
 */
export function buildSections(
  sections: SectionInput[],
  taken: Iterable<string> = []
): { panels: Record<string, Panel>; layouts: Layout[]; built: BuiltPanel[] } {
  const used = new Set(taken);
  const panels: Record<string, Panel> = {};
  const layouts: Layout[] = [];
  const built: BuiltPanel[] = [];
  for (const section of sections) {
    const keys = section.panels.map((panel) => {
      const stem = slugify(panel.title).slice(0, 40);
      let key = stem;
      for (let n = 2; used.has(key); n++) key = `${stem}-${n}`;
      used.add(key);
      return key;
    });
    const places = packGrid(
      section.panels.map((p) => ({
        ...DEFAULT_SIZE[p.kind],
        ...(p.width ? { width: p.width } : {}),
        ...(p.height ? { height: p.height } : {}),
      }))
    );
    const items: GridItem[] = section.panels.map((panel, i) => {
      panels[keys[i]] = buildPanel(panel);
      built.push({ key: keys[i], section: section.title ?? "", panel });
      return {
        x: places[i].x,
        y: places[i].y,
        width: places[i].width,
        height: places[i].height,
        content: { $ref: `#/spec/panels/${keys[i]}` },
      };
    });
    layouts.push({
      kind: "Grid",
      spec: { ...(section.title ? { display: { title: section.title, collapse: { open: true } } } : {}), items },
    });
  }
  return { panels, layouts, built };
}

/** The `CreateDashboardV2` body for a dashboard input. */
export function buildDashboard(input: DashboardInput, environment?: string): BuiltDashboard {
  const { panels, layouts, built } = buildSections(sectionsOf(input, environment));
  const body: PostableDashboard = {
    schemaVersion: DASHBOARD_SCHEMA_VERSION,
    name: input.name ?? slugify(input.title),
    tags: tagsOf(input.tags),
    spec: {
      display: { name: input.title, ...(input.description ? { description: input.description } : {}) },
      duration: "1h",
      variables: [],
      panels,
      layouts,
    },
  };
  return { body, panels: built };
}

/** The builder queries a panel runs, for validating it against the live instance before saving. */
export function panelProbe(
  panel: PanelInput
): { requestType: RequestType; queries: BuilderQueryInput[]; formulas: FormulaInput[]; promql?: string } | undefined {
  if (panel.kind === "text") return undefined;
  return {
    requestType: REQUEST_TYPE[panel.kind],
    queries: panel.queries ?? [],
    formulas: panel.formulas ?? [],
    promql: panel.promql,
  };
}

export { tagsOf };
