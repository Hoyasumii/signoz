/**
 * Builds `src/mcp/generated/catalog.json` from the spec and the SDK's operation table: every
 * operation the MCP's generic tools may reach, its parameters, its body schema and whether it is
 * destructive. Deterministic: the same spec gives the same file. Run with `pnpm codegen:mcp`;
 * `tests/unit/mcp/catalog.test.ts` fails when the committed file is stale.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { Catalog, CatalogOperation, CatalogParam, JsonSchema, OperationKind } from "../src/mcp/catalog-types";
import { OPERATION_METHODS, OPERATIONS, SIGNOZ_API_VERSION, type OperationId } from "../src/generated/operations";

const ROOT = join(__dirname, "..");
export const CATALOG_FILE = join(ROOT, "src/mcp/generated/catalog.json");
const SPEC_FILE = join(ROOT, `spec/openapi.${SIGNOZ_API_VERSION}.yml`);

/**
 * Operations the generic tools never reach: the session lifecycle belongs to the SDK (a model that
 * logs the server out, or rotates its tokens, breaks every later call), and the SSO callbacks and
 * the raw export stream are not JSON a model can read.
 */
const EXCLUDED = new Set<string>([
  "RotateSession",
  "DeleteSession",
  "CreateSessionByEmailPassword",
  "CreateSessionByGoogleCallback",
  "CreateSessionByOIDCCallback",
  "CreateSessionBySAMLCallback",
  "HandleExportRawDataPOST",
]);

/** POSTs that only read: queries, previews and lookups that need a body. `Test*` sends a notification: a write. */
const READ_VERB = /^(Get|List|Query|Search|Preview|Inspect|Prometheus|Replace|Check|Authz|Verify)/;
/** Verbs that lose data or access, whatever the HTTP method. */
const DESTRUCTIVE_VERB = /^(Delete|Revoke|Disconnect|Remove|Unlink)/;

// oxlint-disable-next-line typescript/no-explicit-any -- the spec is untyped YAML
type Any = any;

function kindOf(id: string, http: string): OperationKind {
  if (http === "DELETE" || DESTRUCTIVE_VERB.test(id)) return "destructive";
  if (http === "GET" || READ_VERB.test(id)) return "read";
  return "write";
}

function firstLine(text: string | undefined): string {
  return (text ?? "").trim().split("\n")[0] ?? "";
}

function collectRefs(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, into);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      if (key === "$ref" && typeof inner === "string") into.add(inner.replace("#/components/schemas/", ""));
      else collectRefs(inner, into);
    }
  }
}

/** A schema without the keys a model does not need (examples can be huge). */
function trimSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(trimSchema);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      if (key === "example" || key === "examples" || key === "x-go-name") continue;
      out[key] = trimSchema(inner);
    }
    return out;
  }
  return value;
}

export function buildCatalog(): Catalog {
  const spec: Any = parse(readFileSync(SPEC_FILE, "utf8"), { maxAliasCount: -1 });
  const operations: CatalogOperation[] = [];
  const roots = new Set<string>();

  for (const item of Object.values<Any>(spec.paths)) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const o = item[method];
      if (!o) continue;
      const id = o.operationId as OperationId;
      if (EXCLUDED.has(id)) continue;
      const table = OPERATIONS[id];
      if (!table) throw new Error(`${id} is in the spec but not in OPERATIONS: run pnpm codegen first`);
      const [service, name] = OPERATION_METHODS[id][0] ?? [];
      if (!service || !name) throw new Error(`${id} has no client method`);

      const params: Any[] = [...(item.parameters ?? []), ...(o.parameters ?? [])];
      const toParam = (p: Any): CatalogParam => {
        const schema = trimSchema(p.schema ?? {}) as JsonSchema;
        collectRefs(schema, roots);
        return {
          name: p.name,
          required: Boolean(p.required),
          schema,
          ...(p.description ? { description: String(p.description).trim() } : {}),
        };
      };
      const permissions = new Set<string>();
      for (const requirement of o.security ?? []) {
        for (const scopes of Object.values<string[]>(requirement)) for (const scope of scopes) permissions.add(scope);
      }
      const entry: CatalogOperation = {
        service,
        method: name,
        operationId: id,
        http: table.method,
        path: table.path,
        summary: firstLine(o.summary),
        doc: (o.description ?? "").trim(),
        kind: kindOf(id, table.method),
        permissions: [...permissions].sort(),
        deprecated: Boolean(o.deprecated),
        pathParams: params.filter((p) => p.in === "path").map(toParam),
        queryParams: params.filter((p) => p.in === "query").map(toParam),
      };
      const json =
        o.requestBody?.content?.["application/json"] ?? o.requestBody?.content?.["application/x-www-form-urlencoded"];
      if (json) {
        const schema = trimSchema(json.schema ?? {}) as JsonSchema;
        collectRefs(schema, roots);
        entry.body = { required: Boolean(o.requestBody.required), schema };
      }
      operations.push(entry);
    }
  }

  // Close the set of schemas over their own references.
  const schemas: Record<string, JsonSchema> = {};
  const pending = [...roots];
  while (pending.length > 0) {
    const name = pending.pop() as string;
    if (schemas[name]) continue;
    const schema = spec.components.schemas[name];
    if (!schema) throw new Error(`schema ${name} is referenced but not defined`);
    schemas[name] = trimSchema(schema) as JsonSchema;
    const refs = new Set<string>();
    collectRefs(schema, refs);
    for (const ref of refs) if (!schemas[ref]) pending.push(ref);
  }

  operations.sort((a, b) => `${a.service}.${a.method}`.localeCompare(`${b.service}.${b.method}`));
  const sortedSchemas: Record<string, JsonSchema> = {};
  for (const name of Object.keys(schemas).sort()) sortedSchemas[name] = schemas[name];
  return { generatedFrom: `spec/openapi.${SIGNOZ_API_VERSION}.yml`, operations, schemas: sortedSchemas };
}

export function renderCatalog(catalog: Catalog): string {
  return `${JSON.stringify(catalog, null, 1)}\n`;
}

if (require.main === module) {
  const catalog = buildCatalog();
  writeFileSync(CATALOG_FILE, renderCatalog(catalog));
  // oxlint-disable-next-line no-console -- the generator's report
  console.log(
    `${catalog.operations.length} operations, ${Object.keys(catalog.schemas).length} schemas → src/mcp/generated/catalog.json`
  );
}
