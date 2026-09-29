import { z } from "zod";
import type { SignozClient } from "../../client";
import type { components } from "../../generated/schema";
import { ToolInputError } from "../catalog";
import type { TimeWindow } from "./time";

type Schemas = components["schemas"];
export type QueryEnvelope = Schemas["Querybuildertypesv5QueryEnvelope"];
export type RangeRequest = Schemas["Querybuildertypesv5QueryRangeRequest"];
export type RequestType = "time_series" | "scalar" | "raw";

const TIME_AGGREGATIONS = [
  "latest",
  "sum",
  "avg",
  "min",
  "max",
  "count",
  "count_distinct",
  "rate",
  "increase",
] as const;
const SPACE_AGGREGATIONS = ["sum", "avg", "min", "max", "count", "p50", "p75", "p90", "p95", "p99"] as const;

/** One builder query as the tools take it: the v5 shape, with plain strings where v5 wants objects. */
export const builderQuerySchema = z.object({
  name: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/)
    .optional()
    .describe("Query name (A, B, …), used by formulas."),
  signal: z.enum(["traces", "logs", "metrics"]),
  aggregations: z
    .array(z.string())
    .optional()
    .describe(
      "traces/logs: one expression per entry, e.g. 'count()', 'p95(duration_nano)', " +
        "\"countIf(has_error = true)\", 'rate()', 'count_distinct(trace_id)'. Metrics use `metric` instead."
    ),
  metric: z
    .object({
      name: z.string().describe("Metric name, e.g. 'http.server.duration.count'."),
      timeAggregation: z.enum(TIME_AGGREGATIONS).optional().describe("Default: rate for counters, avg otherwise."),
      spaceAggregation: z.enum(SPACE_AGGREGATIONS).optional().describe("Default: sum."),
    })
    .optional(),
  filter: z
    .string()
    .optional()
    .describe(
      "v5 filter expression: \"service.name = 'point-api' AND has_error = true\", " +
        "\"http.route CONTAINS 'orders'\", \"severity_text IN ('ERROR', 'FATAL')\"."
    ),
  groupBy: z.array(z.string()).optional().describe("Attribute names to group by, e.g. ['service.name', 'http.route']."),
  orderBy: z
    .array(z.object({ key: z.string(), direction: z.enum(["asc", "desc"]).optional() }))
    .optional()
    .describe("Order: an aggregation alias/expression, or a field such as 'timestamp'."),
  limit: z.number().int().min(1).max(10_000).optional(),
  having: z.string().optional().describe("Filter on aggregated values, e.g. 'count() > 10'."),
  legend: z.string().optional().describe("Series legend, e.g. '{{service.name}}'."),
  selectFields: z.array(z.string()).optional().describe("raw (list) queries: extra columns to return."),
  disabled: z.boolean().optional().describe("Compute but do not display (inputs of a formula)."),
});
export type BuilderQueryInput = z.infer<typeof builderQuerySchema>;

export const formulaSchema = z.object({
  name: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/)
    .describe("Formula name, e.g. 'F1' or 'error_rate'."),
  expression: z.string().describe("Arithmetic over query names, e.g. 'A / B * 100'."),
  legend: z.string().optional(),
});
export type FormulaInput = z.infer<typeof formulaSchema>;

/** Joins filter expressions with AND, skipping empty ones and parenthesising compound ones. */
export function andFilter(...parts: (string | undefined)[]): string | undefined {
  const present = parts.map((p) => p?.trim()).filter((p): p is string => !!p);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  return present.map((p) => (/\s(OR|or)\s/.test(p) ? `(${p})` : p)).join(" AND ");
}

/** A string literal for a v5 filter expression. */
export function quoteValue(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/** The filter for the configured environment, unless the caller opts out with `all`/``. */
export function environmentFilter(environment: string | undefined): string | undefined {
  if (!environment || environment === "all") return undefined;
  return `deployment.environment = ${quoteValue(environment)}`;
}

const QUERY_NAMES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A v5 builder query spec (the shape both query_range and dashboard panels take). */
export function builderSpec(
  input: BuilderQueryInput,
  index: number,
  stepSeconds?: number
): Schemas["Querybuildertypesv5BuilderQuerySpec"] {
  const name = input.name ?? QUERY_NAMES[index] ?? `Q${index}`;
  const spec: Record<string, unknown> = { name, signal: input.signal };
  if (input.signal === "metrics") {
    if (!input.metric)
      throw new ToolInputError(`Query ${name}: a metrics query needs \`metric\` (name and aggregations).`);
    spec.aggregations = [
      {
        metricName: input.metric.name,
        timeAggregation: input.metric.timeAggregation ?? "rate",
        spaceAggregation: input.metric.spaceAggregation ?? "sum",
      },
    ];
  } else if (input.aggregations && input.aggregations.length > 0) {
    for (const expression of input.aggregations) {
      if (/\)\s*,\s*\w+\(/.test(expression)) {
        throw new ToolInputError(`Query ${name}: '${expression}' packs several calls; pass one expression per entry.`);
      }
    }
    spec.aggregations = input.aggregations.map((expression) => ({ expression }));
  }
  if (input.filter) spec.filter = { expression: input.filter };
  if (input.groupBy?.length) spec.groupBy = input.groupBy.map((field) => ({ name: field }));
  if (input.orderBy?.length) {
    spec.order = input.orderBy.map((order) => ({ key: { name: order.key }, direction: order.direction ?? "desc" }));
  }
  if (input.limit !== undefined) spec.limit = input.limit;
  if (input.having) spec.having = { expression: input.having };
  if (input.legend) spec.legend = input.legend;
  if (input.selectFields?.length) spec.selectFields = input.selectFields.map((field) => ({ name: field }));
  if (input.disabled) spec.disabled = true;
  if (stepSeconds !== undefined) spec.stepInterval = stepSeconds;
  return spec as Schemas["Querybuildertypesv5BuilderQuerySpec"];
}

/** Envelopes for builder queries plus formulas, names filled in. */
export function envelopes(
  queries: BuilderQueryInput[],
  formulas: FormulaInput[] = [],
  stepSeconds?: number
): QueryEnvelope[] {
  if (queries.length === 0) throw new ToolInputError("At least one query is needed.");
  const out: QueryEnvelope[] = queries.map((query, index) => ({
    type: "builder_query",
    spec: builderSpec(query, index, stepSeconds),
  })) as QueryEnvelope[];
  for (const formula of formulas) {
    out.push({
      type: "builder_formula",
      spec: {
        name: formula.name,
        expression: formula.expression,
        ...(formula.legend ? { legend: formula.legend } : {}),
      },
    } as QueryEnvelope);
  }
  return out;
}

export function rangeRequest(window: TimeWindow, requestType: RequestType, queries: QueryEnvelope[]): RangeRequest {
  return {
    schemaVersion: "v1",
    start: window.start,
    end: window.end,
    requestType,
    compositeQuery: { queries },
    formatOptions: { fillGaps: false, formatTableResultForUI: false },
  };
}

export async function runRange(client: SignozClient, request: RangeRequest): Promise<unknown> {
  return client.querier.queryRangeV5({ body: request });
}

// ---- result formatting -------------------------------------------------------------------------

interface RawLabel {
  key?: { name?: string };
  value?: unknown;
}
interface RawSeries {
  labels?: RawLabel[];
  values?: { timestamp?: number; value?: number }[] | null;
}
interface RawBucket {
  index?: number;
  alias?: string;
  meta?: { unit?: string };
  series?: RawSeries[] | null;
}
interface RawResult {
  queryName?: string;
  aggregations?: RawBucket[] | null;
  columns?: { name: string; queryName?: string; columnType?: string; aggregationIndex?: number }[] | null;
  data?: unknown[][] | null;
  rows?: { timestamp?: string; data?: Record<string, unknown> | null }[] | null;
  nextCursor?: string;
}

/** Points kept per series in a tool result; the summary still covers every point. */
export const MAX_POINTS = 60;

function round(value: number): number {
  return Math.abs(value) >= 100 ? Math.round(value * 100) / 100 : Math.round(value * 10_000) / 10_000;
}

function downsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const stride = items.length / max;
  return Array.from({ length: max }, (_, i) => items[Math.floor(i * stride)]);
}

/** A series with its labels as a map, summary statistics and (optionally) its points. */
function formatSeries(series: RawSeries, withPoints: boolean): Record<string, unknown> {
  const labels: Record<string, unknown> = {};
  for (const label of series.labels ?? []) labels[label.key?.name ?? "?"] = label.value;
  const points = (series.values ?? []).filter((p) => typeof p.value === "number" && Number.isFinite(p.value));
  const values = points.map((p) => p.value as number);
  const out: Record<string, unknown> = { labels };
  if (values.length > 0) {
    const sum = values.reduce((a, b) => a + b, 0);
    out.summary = {
      points: values.length,
      min: round(Math.min(...values)),
      max: round(Math.max(...values)),
      avg: round(sum / values.length),
      last: round(values[values.length - 1]),
      peakAt: new Date(points[values.indexOf(Math.max(...values))].timestamp ?? 0).toISOString(),
    };
  } else {
    out.summary = { points: 0 };
  }
  if (withPoints) {
    out.points = downsample(points, MAX_POINTS).map((p) => [
      new Date(p.timestamp ?? 0).toISOString(),
      round(p.value as number),
    ]);
  }
  return out;
}

/** A query_range response, shrunk to what a model can read: series summaries, table rows, log/span rows. */
export function formatRange(response: unknown, options: { withPoints?: boolean; maxSeries?: number } = {}): unknown {
  const { withPoints = false, maxSeries = 20 } = options;
  const envelope = response as
    | { type?: string; data?: { results?: RawResult[] | null }; warning?: unknown }
    | undefined;
  const results = envelope?.data?.results ?? [];
  const out: Record<string, unknown> = { type: envelope?.type };
  if (envelope?.warning) out.warning = envelope.warning;
  out.results = results.map((result) => {
    if (Array.isArray(result.aggregations)) {
      return {
        query: result.queryName,
        aggregations: result.aggregations.map((bucket) => {
          const series = bucket.series ?? [];
          return {
            index: bucket.index,
            ...(bucket.alias ? { alias: bucket.alias } : {}),
            ...(bucket.meta?.unit ? { unit: bucket.meta.unit } : {}),
            seriesCount: series.length,
            series: series.slice(0, maxSeries).map((s) => formatSeries(s, withPoints)),
            ...(series.length > maxSeries ? { truncated: `showing ${maxSeries} of ${series.length} series` } : {}),
          };
        }),
      };
    }
    if (Array.isArray(result.columns)) {
      const names = result.columns.map((c) => c.name);
      return {
        query: result.queryName,
        rows: (result.data ?? []).map((row) =>
          Object.fromEntries(
            row.map((value, i) => [names[i] ?? `col${i}`, typeof value === "number" ? round(value) : value])
          )
        ),
      };
    }
    if (Array.isArray(result.rows)) {
      return {
        query: result.queryName,
        count: result.rows.length,
        rows: result.rows.map((row) => ({ timestamp: row.timestamp, ...(row.data ?? {}) })),
        ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
      };
    }
    return result;
  });
  return out;
}
