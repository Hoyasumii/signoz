import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { describeWindow, resolveWindow, stepFor, timeWindowShape } from "../query/time";
import { andFilter, envelopes, environmentFilter, formatRange, rangeRequest, runRange } from "../query/v5";
import { READ, type ToolContext, environmentOf, run } from "./shared";

interface PromSeries {
  metric?: Record<string, string>;
  values?: [number, string][];
}

/** Metric discovery and metric queries (builder or PromQL). */
export function registerMetricsTools(server: McpServer, context: ToolContext): void {
  const { client } = context;

  server.registerTool(
    "signoz_list_metrics",
    {
      title: "List metrics",
      description:
        "Metric names SigNoz received in the window, with type, unit and description — optionally matching a " +
        "text (e.g. 'http.server', 'jvm', 'queue'). With `name`, the metadata of that one metric instead.",
      inputSchema: {
        search: z.string().optional(),
        name: z.string().optional().describe("Exact metric name: answers its metadata (type, temporality, unit)."),
        limit: z.number().int().min(1).max(1000).optional().describe("Default 100."),
        ...timeWindowShape,
      },
      annotations: READ,
    },
    async (input) =>
      run(async () => {
        if (input.name) return client.metrics.getMetricMetadata({ query: { metricName: input.name } });
        const window = resolveWindow(input, Date.now(), "24h");
        const data = await client.metrics.listMetrics({
          query: { searchText: input.search, limit: input.limit ?? 100, start: window.start, end: window.end },
        });
        return data;
      })
  );

  server.registerTool(
    "signoz_query_metrics",
    {
      title: "Query a metric",
      description:
        "A metric over time: by name with time/space aggregation, a filter and group by — or a PromQL query. " +
        "Answers each series' min/max/avg/last and peak time (points with withPoints).",
      inputSchema: {
        ...timeWindowShape,
        metric: z.string().optional().describe("Metric name, e.g. 'http.server.request.duration.count'."),
        timeAggregation: z
          .enum(["latest", "sum", "avg", "min", "max", "count", "count_distinct", "rate", "increase"])
          .optional()
          .describe("Default 'rate' (counters); use 'avg' or 'latest' for gauges."),
        spaceAggregation: z
          .enum(["sum", "avg", "min", "max", "count", "p50", "p75", "p90", "p95", "p99"])
          .optional()
          .describe("Default 'sum'; p50..p99 for histograms."),
        filter: z.string().optional(),
        groupBy: z.array(z.string()).optional(),
        environment: z.string().optional().describe("deployment.environment. Default: SIGNOZ_ENV; 'all' for none."),
        promql: z
          .string()
          .optional()
          .describe("PromQL instead of metric/aggregations, e.g. 'sum(rate(x[5m])) by (le)'."),
        withPoints: z.boolean().optional(),
      },
      annotations: READ,
    },
    async (input) =>
      run(async () => {
        const window = resolveWindow(input);
        const step = stepFor(window);
        if (input.promql) {
          const data = (await client.prometheus.prometheusQueryRange({
            query: {
              query: input.promql,
              start: String(window.start / 1000),
              end: String(window.end / 1000),
              step: `${step}s`,
            },
          })) as { data?: { result?: PromSeries[] }; warnings?: unknown };
          return {
            window: describeWindow(window),
            stepSeconds: step,
            ...(data.warnings ? { warnings: data.warnings } : {}),
            series: (data.data?.result ?? []).map((series) => {
              const values = (series.values ?? []).map(([, v]) => Number(v)).filter(Number.isFinite);
              return {
                labels: series.metric,
                summary: values.length
                  ? {
                      points: values.length,
                      min: Math.min(...values),
                      max: Math.max(...values),
                      last: values[values.length - 1],
                    }
                  : { points: 0 },
                ...(input.withPoints ? { points: (series.values ?? []).slice(-60) } : {}),
              };
            }),
          };
        }
        if (!input.metric) return "Pass `metric` (or `promql`). Find names with signoz_list_metrics.";
        const filter = andFilter(input.filter, environmentFilter(environmentOf(context, input.environment)));
        const queries = envelopes(
          [
            {
              signal: "metrics",
              metric: {
                name: input.metric,
                timeAggregation: input.timeAggregation,
                spaceAggregation: input.spaceAggregation,
              },
              filter,
              groupBy: input.groupBy,
            },
          ],
          [],
          step
        );
        const response = await runRange(client, rangeRequest(window, "time_series", queries));
        return {
          window: describeWindow(window),
          stepSeconds: step,
          ...(formatRange(response, { withPoints: input.withPoints }) as object),
        };
      })
  );
}
