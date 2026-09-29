import type { SignozClient } from "../client";
import { ToolInputError, findOperation } from "./catalog";
import type { CatalogParam } from "./catalog-types";

/** Characters of JSON a tool result carries before it is cut, to keep the model's context usable. */
export const MAX_RESULT_CHARS = 60_000;

/** The request parts of one operation, shaped as the SDK method takes them. */
export interface CallArgs {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
}

export interface InvokeOptions {
  args?: CallArgs;
  /** Required for destructive operations (delete, revoke, disconnect, unlock, unpin). */
  confirm?: boolean;
}

function checkParams(
  where: string,
  given: Record<string, unknown> | undefined,
  declared: CatalogParam[],
  operation: string
): void {
  const known = new Set(declared.map((p) => p.name));
  const unknown = Object.keys(given ?? {}).filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new ToolInputError(
      `Unknown ${where} parameter(s) for ${operation}: ${unknown.join(", ")}. ` +
        (declared.length > 0
          ? `Expected: ${declared.map((p) => p.name + (p.required ? "" : "?")).join(", ")}.`
          : `It takes none.`)
    );
  }
  for (const param of declared) {
    const value = given?.[param.name];
    if (param.required && (value === undefined || value === null || value === "")) {
      throw new ToolInputError(
        `${operation} needs args.${where}.${param.name}. Use signoz_describe for the full signature.`
      );
    }
  }
}

/**
 * Call `client.<service>.<method>` for one catalog operation.
 *
 * Only catalog operations can be reached (the session lifecycle and SSO callbacks are not in it),
 * unknown or missing path/query parameters are refused before any request, and destructive
 * operations need `confirm: true`.
 */
export async function invoke(client: SignozClient, operation: string, options: InvokeOptions = {}): Promise<unknown> {
  const op = findOperation(operation);
  const name = `${op.service}.${op.method}`;
  const args = options.args ?? {};

  if (op.kind === "destructive" && options.confirm !== true) {
    throw new ToolInputError(`${name} is destructive; call again with confirm: true once the user has agreed.`);
  }
  const extra = Object.keys(args).filter((key) => !["path", "query", "body"].includes(key));
  if (extra.length > 0) {
    throw new ToolInputError(`args takes path, query and body only (received ${extra.join(", ")}).`);
  }
  checkParams("path", args.path, op.pathParams, name);
  checkParams("query", args.query, op.queryParams, name);
  if (op.body?.required && args.body === undefined) {
    throw new ToolInputError(`${name} needs args.body. Use signoz_describe for its schema.`);
  }
  if (!op.body && args.body !== undefined) throw new ToolInputError(`${name} takes no body.`);

  const service = (client as unknown as Record<string, Record<string, unknown>>)[op.service];
  const fn = service?.[op.method];
  if (typeof fn !== "function") {
    // The catalog and the SDK disagree — a stale catalog, not a user mistake.
    throw new Error(`client.${name} is not a function; regenerate the MCP catalog.`);
  }
  const callArgs: CallArgs = {};
  if (op.pathParams.length > 0) callArgs.path = args.path;
  if (args.query !== undefined) callArgs.query = args.query;
  if (args.body !== undefined) callArgs.body = args.body;
  const takesArgs = op.pathParams.length > 0 || op.queryParams.length > 0 || op.body !== undefined;
  const result: unknown = await (takesArgs ? fn.call(service, callArgs) : fn.call(service));
  return result === undefined ? { ok: true } : result;
}

/** JSON for a tool result, cut at {@link MAX_RESULT_CHARS}. */
export function toResultText(value: unknown): string {
  const text = typeof value === "string" ? value : (JSON.stringify(value, null, 1) ?? "null");
  if (text.length <= MAX_RESULT_CHARS) return text;
  return (
    `${text.slice(0, MAX_RESULT_CHARS)}\n…[truncated: ${text.length} characters in total. ` +
    "Narrow the request: a shorter time range, a filter, a smaller limit.]"
  );
}
