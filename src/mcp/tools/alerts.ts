import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { describeWindow, resolveWindow, timeWindowShape } from "../query/time";
import { READ, type ToolContext, run } from "./shared";

/** Firing alerts, alert rules and their history. */
export function registerAlertTools(server: McpServer, context: ToolContext): void {
  const { client } = context;

  server.registerTool(
    "signoz_list_alerts",
    {
      title: "List firing alerts",
      description: "Alerts active right now (firing or silenced): name, severity, since when, summary and labels.",
      inputSchema: {
        search: z.string().optional().describe("Only alerts whose name or labels contain this text."),
      },
      annotations: READ,
    },
    async ({ search }) =>
      run(async () => {
        const alerts = (await client.alerts.getAlerts()) ?? [];
        const needle = search?.toLowerCase();
        return alerts
          .filter(
            (alert) =>
              !needle ||
              JSON.stringify(alert.labels ?? {})
                .toLowerCase()
                .includes(needle)
          )
          .map((alert) => {
            const labels = (alert.labels ?? {}) as Record<string, string>;
            const annotations = (alert.annotations ?? {}) as Record<string, string>;
            return {
              name: labels.alertname,
              severity: labels.severity,
              state: alert.status?.state,
              since: alert.startsAt,
              summary: annotations.summary ?? annotations.description,
              ruleId: labels.ruleId,
              labels,
            };
          });
      })
  );

  server.registerTool(
    "signoz_list_rules",
    {
      title: "List alert rules",
      description:
        "Every alert rule: id, name, state (firing/inactive/disabled), severity, type and evaluation window.",
      inputSchema: {
        search: z.string().optional().describe("Only rules whose name contains this text."),
        state: z.string().optional().describe("Only rules in this state, e.g. 'firing'."),
      },
      annotations: READ,
    },
    async ({ search, state }) =>
      run(async () => {
        const rules = (await client.rules.listRules()) ?? [];
        const needle = search?.toLowerCase();
        return rules
          .filter((rule) => !needle || (rule.alert ?? "").toLowerCase().includes(needle))
          .filter((rule) => !state || rule.state === state)
          .map((rule) => ({
            id: rule.id,
            name: rule.alert,
            state: rule.state,
            disabled: rule.disabled,
            severity: rule.labels?.severity,
            type: rule.alertType,
            ruleType: rule.ruleType,
            evalWindow: rule.evalWindow,
            frequency: rule.frequency,
          }));
      })
  );

  server.registerTool(
    "signoz_get_rule",
    {
      title: "Get an alert rule",
      description: "One alert rule in full: its condition (queries and threshold), labels, annotations and channels.",
      inputSchema: { id: z.string().min(1) },
      annotations: READ,
    },
    async ({ id }) => run(() => client.rules.getRuleByID({ path: { id } }))
  );

  server.registerTool(
    "signoz_rule_history",
    {
      title: "Alert rule history",
      description:
        "When an alert rule fired and resolved in a window (timeline), with totals (stats) — to line a spike up " +
        "with the alerts it raised.",
      inputSchema: {
        id: z.string().min(1),
        ...timeWindowShape,
        limit: z.number().int().min(1).max(1000).optional().describe("Default 100."),
      },
      annotations: READ,
    },
    async (input) =>
      run(async () => {
        const window = resolveWindow(input, Date.now(), "24h");
        const [timeline, stats] = await Promise.all([
          client.rules.getRuleHistoryTimeline({
            path: { id: input.id },
            query: { start: window.start, end: window.end, limit: input.limit ?? 100 },
          }),
          client.rules
            .getRuleHistoryStats({ path: { id: input.id }, query: { start: window.start, end: window.end } })
            .catch((error: unknown) => ({ unavailable: error instanceof Error ? error.message : String(error) })),
        ]);
        return { window: describeWindow(window), stats, timeline };
      })
  );
}
