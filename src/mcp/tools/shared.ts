import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { SignozClient } from "../../client";
import { errorResult } from "../errors";
import { toResultText } from "../invoke";

/** What every tool module needs. */
export interface ToolContext {
  client: SignozClient;
  /** The default `deployment.environment` (`SIGNOZ_ENV`), applied unless a call says otherwise. */
  environment?: string;
}

export const READ = { readOnlyHint: true, openWorldHint: true } as const;
export const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

/** Runs a tool body, answering its result as JSON text or its error as text the model can act on. */
export async function run(work: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return { content: [{ type: "text", text: toResultText(await work()) }] };
  } catch (error) {
    return errorResult(error);
  }
}

/** The SigNoz UI page for a dashboard. */
export function dashboardUrl(client: SignozClient, id: string): string {
  return `${client.baseUrl}/dashboard/${encodeURIComponent(id)}`;
}

/** The environment a call filters on: its own, else the configured one; `all` means none. */
export function environmentOf(context: ToolContext, given: string | undefined): string | undefined {
  const value = given ?? context.environment;
  return value && value !== "all" ? value : undefined;
}
