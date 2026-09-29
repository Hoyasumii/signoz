/**
 * `@hoyasumii/signoz/mcp` — an MCP server over this SDK.
 *
 * `serveSignozMcpStdio({ baseUrl, apiKey })` serves it over stdio;
 * `startSignozMcpServer({ port, baseUrl, apiKey })` serves it over HTTP;
 * `buildSignozMcpServer(client)` gives the bare `McpServer` for any other transport.
 */
export { serveSignozMcpStdio } from "./stdio";
export type { SignozMcpStdioOptions, RunningSignozMcpStdio } from "./stdio";
export { startSignozMcpServer } from "./server";
export type { SignozMcpServerOptions, RunningSignozMcpServer } from "./server";
export { buildSignozMcpServer, SERVER_NAME, SERVER_VERSION } from "./build";
export type { BuildSignozMcpServerOptions } from "./build";
export {
  CONFIG_KEYS,
  clientFor,
  configDir,
  configFilePath,
  readEnvFile,
  resolveMcpConfig,
  writeEnvFile,
} from "./config";
export type { ConfigKey, ConfigValues, McpConfig, McpConfigFlags, SignozConnection } from "./config";
export { CATALOG, describeOperation, searchCatalog, ToolInputError } from "./catalog";
export type { Catalog, CatalogOperation, CatalogParam, OperationKind } from "./catalog-types";
export { invoke, MAX_RESULT_CHARS } from "./invoke";
export type { CallArgs, InvokeOptions } from "./invoke";
export { buildDashboard, DASHBOARD_SCHEMA_VERSION } from "./query/dashboard";
export type { DashboardInput, PanelInput, PresetInput, SectionInput } from "./query/dashboard";
