import * as fs from "node:fs";
import * as path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SignozClient } from "../client";
import { CATALOG } from "./catalog";
import { registerAlertTools } from "./tools/alerts";
import { registerDashboardTools } from "./tools/dashboards";
import { registerGenericTools } from "./tools/generic";
import { registerMetricsTools } from "./tools/metrics";
import { registerTelemetryTools } from "./tools/telemetry";

export const SERVER_NAME = "signoz";
/** The package's own version, read at runtime: `src/mcp/` and `dist/mcp/` both sit two levels below `package.json`. */
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf8")) as {
  version: string;
  homepage: string;
};
export const SERVER_VERSION = PACKAGE_JSON.version;
/** The documentation site, the package's `homepage`. */
export const DOCS_URL = PACKAGE_JSON.homepage;

export interface BuildSignozMcpServerOptions {
  /** The default `deployment.environment` the telemetry tools filter on, e.g. `production`. */
  environment?: string;
}

/**
 * An MCP server exposing SigNoz, with no transport attached.
 *
 * Curated tools read services, logs, traces, metrics and alerts and build dashboards;
 * `signoz_resources` / `signoz_describe` / `signoz_call` reach every other operation of the REST
 * API. Connect it to any transport — {@link startSignozMcpServer} serves it over HTTP,
 * {@link serveSignozMcpStdio} over stdio.
 */
export function buildSignozMcpServer(client: SignozClient, options: BuildSignozMcpServerOptions = {}): McpServer {
  const environment = options.environment || undefined;
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        `SigNoz observability (${client.baseUrl}). Find what exists first: signoz_list_services for service names, ` +
        "signoz_field_keys/signoz_field_values for attributes (http.route, deployment.environment, job names). " +
        "Investigate with signoz_query (builder queries or PromQL over a window), signoz_search_logs, " +
        "signoz_search_traces and signoz_get_trace; alerts with signoz_list_alerts/signoz_list_rules/" +
        "signoz_rule_history. Build dashboards with signoz_create_dashboard (presets api_red, worker_failures, " +
        "logs_errors, or your own panels; try a panel with signoz_preview_panel) and give the user the url it " +
        "answers. Filters use the v5 expression syntax: service.name = 'x' AND has_error = true. " +
        (environment
          ? `The default environment is '${environment}' (deployment.environment); pass environment: 'all' to lift it. `
          : "") +
        `For anything else (saved views, channels, downtimes, … — ${CATALOG.operations.length} operations), ` +
        "use signoz_resources, signoz_describe, signoz_call. Ask before anything destructive or public.",
    }
  );
  const context = { client, environment };
  registerTelemetryTools(server, context);
  registerMetricsTools(server, context);
  registerAlertTools(server, context);
  registerDashboardTools(server, context);
  registerGenericTools(server, context);
  return server;
}
