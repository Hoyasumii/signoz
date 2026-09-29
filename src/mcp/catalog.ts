import catalogJson from "./generated/catalog.json";
import { Catalog, CatalogOperation, CatalogParam, JsonSchema } from "./catalog-types";

/** Every operation the generic tools reach, as `scripts/build-mcp-catalog.ts` read them off the spec. */
export const CATALOG: Catalog = catalogJson as unknown as Catalog;

const BY_NAME = new Map<string, CatalogOperation>();
for (const op of CATALOG.operations) {
  BY_NAME.set(`${op.service}.${op.method}`.toLowerCase(), op);
  BY_NAME.set(op.operationId.toLowerCase(), op);
}

/** Thrown for a request the model can fix by changing its arguments; its message is shown verbatim. */
export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

/** An operation by `service.method` (`dashboard.listDashboardsV2`) or by operationId (`ListDashboardsV2`). */
export function findOperation(name: string): CatalogOperation {
  const found = BY_NAME.get(name.trim().toLowerCase());
  if (found) return found;
  const word = name.split(".").pop()?.toLowerCase() ?? "";
  const close = CATALOG.operations
    .filter((op) => `${op.service}.${op.method}`.toLowerCase().includes(word))
    .slice(0, 10)
    .map((op) => `${op.service}.${op.method}`);
  throw new ToolInputError(
    `Unknown operation '${name}'.` +
      (close.length > 0 ? ` Did you mean: ${close.join(", ")}?` : "") +
      " Use signoz_resources to list them."
  );
}

function firstSentence(text: string): string {
  const match = /^(.+?[.!?])(\s|$)/.exec(text);
  const sentence = match ? match[1] : text;
  return sentence.length > 140 ? `${sentence.slice(0, 139)}…` : sentence;
}

function nameOf(op: CatalogOperation): string {
  return `${op.service}.${op.method}`;
}

/**
 * Operations whose name, path, summary or docs match every word of `query`. With no query, every
 * service with its operation names.
 */
export function searchCatalog(query?: string): string {
  const words = (query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const matches = CATALOG.operations.filter((op) => {
    const haystack = [nameOf(op), op.operationId, op.path, op.summary, op.doc].join(" ").toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  if (matches.length === 0) return `No operation matches '${query}'. Try a shorter query, or none to list all.`;

  if (words.length === 0) {
    const services = new Map<string, string[]>();
    for (const op of matches) services.set(op.service, [...(services.get(op.service) ?? []), op.method]);
    return [
      `${matches.length} operations in ${services.size} services (call signoz_resources with a query for details, ` +
        "signoz_describe for one operation's parameters):",
      ...[...services].map(([service, methods]) => `- ${service}: ${methods.join(", ")}`),
    ].join("\n");
  }
  return matches
    .map((op) => {
      const summary = op.summary || firstSentence(op.doc);
      return `- ${nameOf(op)} [${op.kind}] ${op.http} ${op.path}${summary ? ` — ${summary}` : ""}`;
    })
    .join("\n");
}

const MAX_RENDER_DEPTH = 6;

function refName(schema: JsonSchema): string | undefined {
  const ref = schema.$ref;
  return typeof ref === "string" ? ref.replace("#/components/schemas/", "") : undefined;
}

/**
 * A JSON Schema as a compact TypeScript-like type. `$ref`s expand up to `depth` levels; past that,
 * or on a cycle, they print as their schema name, which `signoz_describe` can expand on its own.
 */
export function renderSchema(schema: JsonSchema, depth = 3, indent = "", seen: readonly string[] = []): string {
  const ref = refName(schema);
  if (ref !== undefined) {
    const target = CATALOG.schemas[ref];
    if (!target || depth <= 0 || seen.includes(ref)) return ref;
    const inner = renderSchema(target, depth - 1, indent, [...seen, ref]);
    return /^[{"]/.test(inner) || inner.includes("|") ? `${inner} /* ${ref} */` : inner;
  }
  const variants = (schema.oneOf ?? schema.anyOf) as JsonSchema[] | undefined;
  if (Array.isArray(variants)) {
    const discriminator = (schema.discriminator as { propertyName?: string } | undefined)?.propertyName;
    const rendered = variants.map((v) => renderSchema(v, depth, `${indent}  `, seen));
    const head = discriminator ? `/* one of, by '${discriminator}' */ ` : "";
    return `${head}${rendered.join(`\n${indent}  | `)}`;
  }
  if (Array.isArray(schema.enum)) return (schema.enum as unknown[]).map((v) => JSON.stringify(v)).join(" | ");
  if (schema.type === "array") {
    const items = renderSchema((schema.items as JsonSchema) ?? {}, depth, indent, seen);
    return items.includes("\n") || items.includes("|") ? `Array<${items}>` : `${items}[]`;
  }
  const properties = schema.properties as Record<string, JsonSchema> | undefined;
  const additional = schema.additionalProperties as JsonSchema | boolean | undefined;
  if (properties || (additional && typeof additional === "object")) {
    const required = new Set((schema.required as string[] | undefined) ?? []);
    const lines: string[] = [];
    for (const [name, value] of Object.entries(properties ?? {})) {
      const doc = typeof value.description === "string" ? ` // ${firstSentence(value.description)}` : "";
      const type = renderSchema(value, depth, `${indent}  `, seen);
      lines.push(`${indent}  ${name}${required.has(name) ? "" : "?"}: ${type}${doc}`);
    }
    if (additional && typeof additional === "object") {
      lines.push(`${indent}  [key: string]: ${renderSchema(additional, depth, `${indent}  `, seen)}`);
    }
    if (lines.length === 0) return "{}";
    return `{\n${lines.join("\n")}\n${indent}}`;
  }
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (typeof schema.type === "string") return schema.type;
  return "unknown";
}

function renderParam(param: CatalogParam): string {
  const type = renderSchema(param.schema, 1);
  const doc = param.description ? ` — ${firstSentence(param.description)}` : "";
  return `- ${param.name}${param.required ? "" : " (optional)"}: ${type}${doc}`;
}

/** Everything the model needs to call one operation through `signoz_call`. */
export function describeOperation(name: string, depth = 3): string {
  const op = findOperation(name);
  const lines: string[] = [`${nameOf(op)}  [${op.kind}]  (operationId ${op.operationId})`, `${op.http} ${op.path}`];
  if (op.permissions.length > 0) lines.push(`Permission: ${op.permissions.join(", ")}`);
  if (op.deprecated) lines.push("Deprecated.");
  if (op.summary) lines.push("", op.summary);
  if (op.doc && op.doc !== op.summary) lines.push("", op.doc);
  if (op.pathParams.length > 0) lines.push("", "args.path:", ...op.pathParams.map(renderParam));
  if (op.queryParams.length > 0) lines.push("", "args.query:", ...op.queryParams.map(renderParam));
  if (op.body) {
    lines.push(
      "",
      `args.body${op.body.required ? "" : " (optional)"}:`,
      renderSchema(op.body.schema, Math.min(depth, MAX_RENDER_DEPTH)),
      "(A name alone is a schema not expanded at this depth: call signoz_describe with `schema` set to it.)"
    );
  }
  if (op.kind === "destructive") lines.push("", "Destructive: signoz_call requires `confirm: true`.");

  const example: Record<string, unknown> = {};
  if (op.pathParams.length > 0) example.path = Object.fromEntries(op.pathParams.map((p) => [p.name, `<${p.name}>`]));
  const requiredQuery = op.queryParams.filter((p) => p.required);
  if (requiredQuery.length > 0) example.query = Object.fromEntries(requiredQuery.map((p) => [p.name, `<${p.name}>`]));
  if (op.body?.required) example.body = {};
  lines.push(
    "",
    "Example signoz_call input:",
    JSON.stringify({
      operation: nameOf(op),
      ...(Object.keys(example).length > 0 ? { args: example } : {}),
      ...(op.kind === "destructive" ? { confirm: true } : {}),
    })
  );
  return lines.join("\n");
}

/** One schema from the spec, expanded `depth` levels. */
export function describeSchema(name: string, depth = 3): string {
  const schema = CATALOG.schemas[name];
  if (!schema) {
    const close = Object.keys(CATALOG.schemas)
      .filter((key) => key.toLowerCase().includes(name.toLowerCase()))
      .slice(0, 10);
    throw new ToolInputError(
      `Unknown schema '${name}'.${close.length > 0 ? ` Did you mean: ${close.join(", ")}?` : ""}`
    );
  }
  const doc = typeof schema.description === "string" ? `\n${schema.description}` : "";
  return `${name}${doc}\n${renderSchema(schema, Math.min(depth, MAX_RENDER_DEPTH), "", [name])}`;
}
