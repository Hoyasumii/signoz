import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SignozApiError, SignozConfigError, SignozSessionExpiredError, SignozTimeoutError } from "../errors";
import { ToolInputError } from "./catalog";

/** What to do about a status the model cannot fix by changing arguments. */
function hintFor(status: number): string {
  if (status === 401)
    return " (the credential was refused: check SIGNOZ_API_KEY, or save a new session with `signoz mcp config`)";
  if (status === 403) return " (this user or service account lacks the permission the operation needs)";
  if (status === 429) return " (rate limited: wait a little and try again)";
  return "";
}

/** A thrown error as text the model can act on. */
export function describeError(error: unknown): string {
  if (error instanceof SignozSessionExpiredError) {
    return (
      "The SigNoz browser session expired (idle for 7 days or older than 30). Copy AUTH_TOKEN and " +
      "REFRESH_AUTH_TOKEN from the browser again and save them with `signoz mcp config`, or switch to an API key."
    );
  }
  if (error instanceof SignozApiError) {
    const body = error.body === undefined ? "" : JSON.stringify(error.body);
    const detail = body && !error.message.includes(body) ? ` — ${body.slice(0, 1500)}` : "";
    return `SigNoz answered ${error.status}${hintFor(error.status)}: ${error.message}${detail}`;
  }
  if (error instanceof SignozTimeoutError) return `${error.message} (narrow the time range or the query)`;
  if (error instanceof SignozConfigError) return error.message;
  if (error instanceof ToolInputError) return error.message;
  if (error instanceof TypeError && /fetch failed/i.test(error.message)) {
    const cause = (error as { cause?: { message?: string } }).cause?.message;
    return `Could not reach the SigNoz server: ${cause ?? error.message}`;
  }
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

export function errorResult(error: unknown): CallToolResult {
  return { isError: true, content: [{ type: "text", text: describeError(error) }] };
}
