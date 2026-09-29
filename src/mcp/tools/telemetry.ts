import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SIGNOZ_API_VERSION } from "../../generated/operations";
import { ToolInputError } from "../catalog";
import { describeWindow, resolveWindow, stepFor, timeWindowShape } from "../query/time";
import {
  type BuilderQueryInput,
  type QueryEnvelope,
  andFilter,
  builderQuerySchema,
  envelopes,
  environmentFilter,
  formatRange,
  formulaSchema,
  quoteValue,
  rangeRequest,
  runRange,
} from "../query/v5";
import { READ, type ToolContext, environmentOf, run } from "./shared";

const environment = z
  .string()
  .optional()
  .describe("deployment.environment to filter on. Default: the configured SIGNOZ_ENV; 'all' for every environment.");

const BODY_CHARS = 800;

function truncate(text: unknown, max: number): unknown {
  return typeof text === "string" && text.length > max ? `${text.slice(0, max)}…` : text;
}

/** One raw log row, without the attribute maps unless asked. */
function compactLog(row: Record<string, unknown>, withAttributes: boolean): Record<string, unknown> {
  const resources = (row.resources_string ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {
    timestamp: row.timestamp,
    severity: row.severity_text,
    service: resources["service.name"],
    body: truncate(row.body, BODY_CHARS),
  };
  if (row.trace_id) out.trace_id = row.trace_id;
  if (row.span_id) out.span_id = row.span_id;
  if (withAttributes) {
    out.attributes = {
      ...(row.attributes_string as object),
      ...(row.attributes_number as object),
      ...(row.attributes_bool as object),
    };
    out.resources = resources;
  }
  return out;
}

/** One raw span row with its duration in milliseconds. */
function compactSpan(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  if (typeof row.duration_nano === "number") {
    out.duration_ms = Math.round(row.duration_nano / 1e4) / 100;
    delete out.duration_nano;
  }
  return out;
}

interface WaterfallSpan {
  span_id?: string;
  parent_span_id?: string;
  name?: string;
  service_name?: string;
  duration_nano?: number;
  has_error?: boolean;
  level?: number;
  kind_string?: string;
  status_message?: string;
  status_code_string?: string;
  http_method?: string;
  http_url?: string;
  db_operation?: string;
  resource?: Record<string, string> | null;
  attributes?: Record<string, unknown> | null;
  events?: { name?: string; attributeMap?: Record<string, unknown> }[] | null;
}

const SPAN_ATTRIBUTES = [
  "http.route",
  "http.request.method",
  "http.method",
  "http.response.status_code",
  "http.status_code",
  "url.full",
  "db.system",
  "db.statement",
  "db.query.text",
  "messaging.destination.name",
  "exception.type",
  "exception.message",
  "error.type",
];

function compactWaterfallSpan(span: WaterfallSpan): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  for (const key of SPAN_ATTRIBUTES) {
    const value = span.attributes?.[key];
    if (value !== undefined && value !== "") attributes[key] = truncate(value, 300);
  }
  const errorEvents = (span.events ?? [])
    .filter((event) => event.name === "exception")
    .map((event) => ({
      type: event.attributeMap?.["exception.type"],
      message: truncate(event.attributeMap?.["exception.message"], 500),
    }));
  return {
    level: span.level,
    name: span.name,
    service: span.service_name ?? span.resource?.["service.name"],
    duration_ms: typeof span.duration_nano === "number" ? Math.round(span.duration_nano / 1e4) / 100 : undefined,
    ...(span.has_error ? { error: true } : {}),
    ...(span.status_message ? { status_message: truncate(span.status_message, 300) } : {}),
    ...(span.kind_string ? { kind: span.kind_string } : {}),
    ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
    ...(errorEvents.length > 0 ? { exceptions: errorEvents } : {}),
    span_id: span.span_id,
  };
}

/** Whoami, services, logs, traces, a trace, attribute discovery and the free-form query. */
export function registerTelemetryTools(server: McpServer, context: ToolContext): void {
  const { client } = context;

  server.registerTool(
    "signoz_whoami",
    {
      title: "SigNoz connection",
      description:
        "Who this MCP server acts as on which SigNoz instance: the user (session) or service account (API key), " +
        "the instance URL, the SigNoz version the SDK mirrors and the default environment.",
      inputSchema: {},
      annotations: READ,
    },
    async () =>
      run(async () => {
        const base = {
          baseUrl: client.baseUrl,
          auth: client.auth,
          sdkSignozVersion: SIGNOZ_API_VERSION,
          defaultEnvironment: context.environment ?? null,
        };
        if (client.auth === "api_key") {
          const account = await client.serviceaccount.getMyServiceAccount().catch(() => undefined);
          return { ...base, serviceAccount: account ?? "unknown (the key cannot read its own account)" };
        }
        const me = await client.users.getMyUser();
        return {
          ...base,
          user: {
            id: me.id,
            email: me.email,
            displayName: me.displayName,
            roles: me.userRoles?.map((r) => r.role?.name ?? r),
          },
        };
      })
  );

  server.registerTool(
    "signoz_list_services",
    {
      title: "List services",
      description:
        "Services that sent spans in the window, with span count, error count, error rate and p95 latency — the " +
        "first step to find the exact service.name of an application (e.g. the Point API and its workers).",
      inputSchema: {
        ...timeWindowShape,
        environment,
        search: z.string().optional().describe("Only services whose name contains this text."),
        limit: z.number().int().min(1).max(500).optional().describe("Default 100."),
      },
      annotations: READ,
    },
    async (input) =>
      run(async () => {
        const window = resolveWindow(input);
        const filter = andFilter(
          environmentFilter(environmentOf(context, input.environment)),
          input.search ? `service.name CONTAINS ${quoteValue(input.search)}` : undefined
        );
        const query: BuilderQueryInput = {
          signal: "traces",
          aggregations: ["count()", "countIf(has_error = true)", "p95(duration_nano)"],
          filter,
          groupBy: ["service.name"],
          orderBy: [{ key: "count()", direction: "desc" }],
          limit: input.limit ?? 100,
        };
        const result = formatRange(await runRange(client, rangeRequest(window, "scalar", envelopes([query]))));
        const rows = ((result as { results?: { rows?: Record<string, unknown>[] }[] }).results?.[0]?.rows ?? []).map(
          (row) => {
            const values = Object.values(row);
            const [service, spans, errors, p95] = values as [string, number, number, number];
            return {
              service,
              spans,
              errors,
              errorRatePercent: spans ? Math.round((errors / spans) * 10_000) / 100 : 0,
              p95_ms: typeof p95 === "number" ? Math.round(p95 / 1e4) / 100 : p95,
            };
          }
        );
        return { window: describeWindow(window), services: rows };
      })
  );

  server.registerTool(
    "signoz_search_logs",
    {
      title: "Search logs",
      description:
        "Latest log lines matching a service, severities, a text and/or a v5 filter expression, newest first. " +
        "Use signoz_field_keys to discover attribute names. Rows carry trace_id when the log is correlated.",
      inputSchema: {
        ...timeWindowShape,
        environment,
        service: z.string().optional().describe("service.name, e.g. 'point-api'."),
        severity: z.array(z.string()).optional().describe("e.g. ['ERROR', 'FATAL'] (matches severity_text)."),
        text: z.string().optional().describe("Substring the log body must contain."),
        filter: z.string().optional().describe("Extra v5 filter expression, e.g. \"k8s.pod.name = 'x'\"."),
        limit: z.number().int().min(1).max(500).optional().describe("Default 50."),
        withAttributes: z.boolean().optional().describe("Include every attribute and resource field (verbose)."),
      },
      annotations: READ,
    },
    async (input) =>
      run(async () => {
        const window = resolveWindow(input);
        const filter = andFilter(
          environmentFilter(environmentOf(context, input.environment)),
          input.service ? `service.name = ${quoteValue(input.service)}` : undefined,
          input.severity?.length ? `severity_text IN (${input.severity.map(quoteValue).join(", ")})` : undefined,
          input.text ? `body CONTAINS ${quoteValue(input.text)}` : undefined,
          input.filter
        );
        const query: BuilderQueryInput = {
          signal: "logs",
          filter,
          orderBy: [{ key: "timestamp", direction: "desc" }],
          limit: input.limit ?? 50,
        };
        const result = formatRange(await runRange(client, rangeRequest(window, "raw", envelopes([query])))) as {
          results?: { rows?: Record<string, unknown>[] }[];
          warning?: unknown;
        };
        const rows = result.results?.[0]?.rows ?? [];
        return {
          window: describeWindow(window),
          filter: filter ?? null,
          count: rows.length,
          ...(result.warning ? { warning: result.warning } : {}),
          logs: rows.map((row) => compactLog(row, input.withAttributes === true)),
        };
      })
  );

  server.registerTool(
    "signoz_search_traces",
    {
      title: "Search spans",
      description:
        "Latest spans matching a service, an operation name, errors only, a minimum duration and/or a v5 filter, " +
        "newest first (or slowest first). Each row has trace_id: open it with signoz_get_trace.",
      inputSchema: {
        ...timeWindowShape,
        environment,
        service: z.string().optional(),
        operation: z.string().optional().describe("Span name, e.g. 'GET /api/orders' (exact match)."),
        errorsOnly: z.boolean().optional(),
        minDurationMs: z.number().min(0).optional(),
        filter: z
          .string()
          .optional()
          .describe("Extra v5 filter, e.g. \"http.route = '/api/orders' AND kind_string = 'Server'\"."),
        orderBy: z.enum(["newest", "slowest"]).optional().describe("Default 'newest'."),
        limit: z.number().int().min(1).max(500).optional().describe("Default 50."),
        fields: z
          .array(z.string())
          .optional()
          .describe("Extra attributes to return, e.g. ['http.route', 'http.response.status_code']."),
      },
      annotations: READ,
    },
    async (input) =>
      run(async () => {
        const window = resolveWindow(input);
        const filter = andFilter(
          environmentFilter(environmentOf(context, input.environment)),
          input.service ? `service.name = ${quoteValue(input.service)}` : undefined,
          input.operation ? `name = ${quoteValue(input.operation)}` : undefined,
          input.errorsOnly ? "has_error = true" : undefined,
          input.minDurationMs !== undefined ? `duration_nano >= ${Math.round(input.minDurationMs * 1e6)}` : undefined,
          input.filter
        );
        const query: BuilderQueryInput = {
          signal: "traces",
          filter,
          orderBy: [{ key: input.orderBy === "slowest" ? "duration_nano" : "timestamp", direction: "desc" }],
          limit: input.limit ?? 50,
          selectFields: [
            "service.name",
            "name",
            "duration_nano",
            "has_error",
            "trace_id",
            "span_id",
            ...(input.fields ?? []),
          ],
        };
        const result = formatRange(await runRange(client, rangeRequest(window, "raw", envelopes([query])))) as {
          results?: { rows?: Record<string, unknown>[] }[];
          warning?: unknown;
        };
        const rows = result.results?.[0]?.rows ?? [];
        return {
          window: describeWindow(window),
          filter: filter ?? null,
          count: rows.length,
          ...(result.warning ? { warning: result.warning } : {}),
          spans: rows.map(compactSpan),
        };
      })
  );

  server.registerTool(
    "signoz_get_trace",
    {
      title: "Get a trace",
      description:
        "One trace as a waterfall: root service, span and error counts, then its spans in order with depth, " +
        "service, duration, error, key HTTP/DB attributes and exceptions.",
      inputSchema: {
        traceId: z.string().min(1),
        maxSpans: z.number().int().min(1).max(2000).optional().describe("Default 300."),
      },
      annotations: READ,
    },
    async ({ traceId, maxSpans }) =>
      run(async () => {
        const trace = await client.tracedetail.getWaterfallV4({ path: { traceID: traceId }, body: {} });
        const spans = ((trace.spans ?? []) as WaterfallSpan[]).map(compactWaterfallSpan);
        const limit = maxSpans ?? 300;
        return {
          traceId,
          rootService: trace.rootServiceName,
          entryPoint: trace.rootServiceEntryPoint,
          start: trace.startTimestampMillis ? new Date(trace.startTimestampMillis).toISOString() : undefined,
          duration_ms:
            trace.startTimestampMillis !== undefined && trace.endTimestampMillis !== undefined
              ? trace.endTimestampMillis - trace.startTimestampMillis
              : undefined,
          totalSpans: trace.totalSpansCount,
          errorSpans: trace.totalErrorSpansCount,
          ...(trace.hasMissingSpans ? { hasMissingSpans: true } : {}),
          ...(trace.hasMore || spans.length > limit ? { truncated: true } : {}),
          spans: spans.slice(0, limit),
        };
      })
  );

  const signal = z.enum(["traces", "logs", "metrics"]);

  server.registerTool(
    "signoz_field_keys",
    {
      title: "Discover attribute names",
      description:
        "Attribute and resource field names SigNoz has seen for a signal, optionally matching a text — to learn " +
        "what to filter or group by (http.route, deployment.environment, a job name attribute…).",
      inputSchema: {
        signal,
        search: z.string().optional().describe("Substring of the field name, e.g. 'route', 'job', 'env'."),
        metricName: z.string().optional().describe("For metrics: the metric whose labels to list."),
        limit: z.number().int().min(1).max(1000).optional().describe("Default 100."),
        ...timeWindowShape,
      },
      annotations: READ,
    },
    async (input) =>
      run(async () => {
        const window = resolveWindow(input, Date.now(), "24h");
        const data = await client.fields.getFieldsKeys({
          query: {
            signal: input.signal,
            searchText: input.search,
            metricName: input.metricName,
            limit: input.limit ?? 100,
            startUnixMilli: window.start,
            endUnixMilli: window.end,
          },
        });
        const keys = Object.values(data.keys ?? {})
          .flat()
          .map((key) => ({
            name: key.name,
            context: key.fieldContext || undefined,
            type: key.fieldDataType || undefined,
          }));
        return { complete: data.complete, count: keys.length, keys };
      })
  );

  server.registerTool(
    "signoz_field_values",
    {
      title: "Discover attribute values",
      description:
        "Values seen for one attribute, e.g. every service.name, deployment.environment or http.route — optionally " +
        "narrowed by a text and by a filter (existingQuery) such as \"service.name = 'point-api'\".",
      inputSchema: {
        signal,
        name: z.string().min(1).describe("Field name, e.g. 'service.name'."),
        search: z.string().optional(),
        existingQuery: z.string().optional().describe("v5 filter the values must co-occur with."),
        metricName: z.string().optional(),
        limit: z.number().int().min(1).max(1000).optional().describe("Default 100."),
        ...timeWindowShape,
      },
      annotations: READ,
    },
    async (input) =>
      run(async () => {
        const window = resolveWindow(input, Date.now(), "24h");
        const data = await client.fields.getFieldsValues({
          query: {
            signal: input.signal,
            name: input.name,
            searchText: input.search,
            existingQuery: input.existingQuery,
            metricName: input.metricName,
            limit: input.limit ?? 100,
            startUnixMilli: window.start,
            endUnixMilli: window.end,
          },
        });
        const values = data.values ?? {};
        return {
          complete: data.complete,
          values: [...(values.stringValues ?? []), ...(values.numberValues ?? []), ...(values.boolValues ?? [])],
          ...(values.relatedValues?.length ? { related: values.relatedValues } : {}),
        };
      })
  );

  server.registerTool(
    "signoz_query",
    {
      title: "Run a query",
      description:
        "Run builder queries over traces, logs or metrics (plus formulas), or PromQL, for a window — the same " +
        "queries a dashboard panel runs. time_series answers each series' min/max/avg/last and peak time (points " +
        "with withPoints); scalar answers one row per group; raw answers rows. Use it to investigate a spike and " +
        "to check a panel's query before putting it on a dashboard.",
      inputSchema: {
        ...timeWindowShape,
        requestType: z.enum(["time_series", "scalar", "raw"]).optional().describe("Default time_series."),
        queries: z.array(builderQuerySchema).optional(),
        formulas: z.array(formulaSchema).optional(),
        promql: z.string().optional().describe("A PromQL query instead of builder queries."),
        environment: z
          .string()
          .optional()
          .describe("Adds deployment.environment = <value> to every builder query. Default: none (filters are yours)."),
        stepSeconds: z.number().int().min(1).optional().describe("Bucket size for time_series. Default: ~100 points."),
        withPoints: z.boolean().optional().describe("Include up to 60 points per series."),
      },
      annotations: READ,
    },
    async (input) =>
      run(async () => {
        const window = resolveWindow(input);
        const requestType = input.requestType ?? "time_series";
        const step = requestType === "time_series" ? (input.stepSeconds ?? stepFor(window)) : undefined;
        let queries: QueryEnvelope[];
        if (input.promql) {
          if (input.queries?.length) throw new ToolInputError("Use either promql or queries, not both.");
          queries = [
            {
              type: "promql",
              spec: { name: "A", query: input.promql, step: step ?? stepFor(window) },
            } as QueryEnvelope,
          ];
        } else {
          const env = environmentFilter(input.environment);
          const withEnv = (input.queries ?? []).map((q) => ({ ...q, filter: andFilter(q.filter, env) }));
          queries = envelopes(withEnv, input.formulas ?? [], step);
        }
        const response = await runRange(client, rangeRequest(window, requestType, queries));
        return {
          window: describeWindow(window),
          ...(step ? { stepSeconds: step } : {}),
          ...(formatRange(response, { withPoints: input.withPoints === true }) as object),
        };
      })
  );
}
