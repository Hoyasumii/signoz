import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CATALOG, describeOperation, describeSchema, searchCatalog } from "../catalog";
import { invoke } from "../invoke";
import { type ToolContext, run } from "./shared";

/** `signoz_resources`, `signoz_describe` and `signoz_call`: the whole REST API through three tools. */
export function registerGenericTools(server: McpServer, context: ToolContext): void {
  const { client } = context;
  server.registerTool(
    "signoz_resources",
    {
      title: "List SigNoz API operations",
      description:
        `Discover the SigNoz REST API: ${CATALOG.operations.length} operations grouped by service (dashboard, rules, ` +
        "channels, savedView, downtimeschedules, metrics, inframonitoring, serviceaccount, users, …). Without a " +
        "query, lists every service with its operation names; with a query (e.g. 'saved view', 'downtime', " +
        "'notification channel'), shows the matching operations. Use it when no dedicated signoz_* tool fits, then " +
        "signoz_describe and signoz_call.",
      inputSchema: { query: z.string().optional().describe("Words to match against names, paths and docs.") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query }) => run(async () => searchCatalog(query))
  );

  server.registerTool(
    "signoz_describe",
    {
      title: "Describe a SigNoz API operation or schema",
      description:
        "Full signature of one operation from signoz_resources — path and query parameters, the body schema, the " +
        "permission it needs, an example signoz_call input — or, with `schema`, one schema from the spec expanded.",
      inputSchema: {
        operation: z
          .string()
          .optional()
          .describe("'service.method' (e.g. 'savedView.createSavedView') or the operationId (e.g. 'CreateSavedView')."),
        schema: z
          .string()
          .optional()
          .describe("A schema name printed by a previous describe, e.g. 'DashboardtypesPanel'."),
        depth: z
          .number()
          .int()
          .min(1)
          .max(6)
          .optional()
          .describe("How many levels of nested schemas to expand (default 3)."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ operation, schema, depth }) =>
      run(async () => {
        if (schema) return describeSchema(schema, depth);
        if (!operation) return "Pass `operation` (or `schema`).";
        return describeOperation(operation, depth);
      })
  );

  server.registerTool(
    "signoz_call",
    {
      title: "Call a SigNoz API operation",
      description:
        "Call any operation from signoz_resources. `args` holds `path` (path parameters), `query` (query string) " +
        "and `body`, as signoz_describe lists them. Destructive operations (delete, revoke, disconnect, unlock) need " +
        "confirm: true — ask the user first. Prefer the dedicated tools (signoz_query, signoz_search_logs, " +
        "signoz_create_dashboard, …) when one fits.",
      inputSchema: {
        operation: z.string().describe("'service.method' or operationId, e.g. 'rules.listRules'."),
        args: z
          .object({
            path: z.record(z.string(), z.unknown()).optional(),
            query: z.record(z.string(), z.unknown()).optional(),
            body: z.unknown().optional(),
          })
          .optional(),
        confirm: z.boolean().optional().describe("Must be true to run a destructive operation."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    },
    async ({ operation, args, confirm }) => run(() => invoke(client, operation, { args, confirm }))
  );
}
