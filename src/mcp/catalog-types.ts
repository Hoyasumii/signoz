/** Shapes of `generated/catalog.json`, written by `scripts/build-mcp-catalog.ts`. */

export type OperationKind = "read" | "write" | "destructive";

/** A JSON Schema fragment as the spec writes it, `$ref`s pointing into {@link Catalog.schemas}. */
export type JsonSchema = Record<string, unknown>;

export interface CatalogParam {
  name: string;
  required: boolean;
  schema: JsonSchema;
  description?: string;
}

export interface CatalogOperation {
  /** The client namespace, e.g. `dashboard` for `client.dashboard.*`. */
  service: string;
  /** The method on that namespace, e.g. `listDashboardsV2`. */
  method: string;
  operationId: string;
  http: string;
  path: string;
  summary: string;
  doc: string;
  kind: OperationKind;
  /** The permissions the spec's `security` lists, e.g. `dashboard:list`. */
  permissions: string[];
  deprecated: boolean;
  pathParams: CatalogParam[];
  queryParams: CatalogParam[];
  body?: { required: boolean; schema: JsonSchema };
}

export interface Catalog {
  generatedFrom: string;
  operations: CatalogOperation[];
  /** Every `components.schemas` entry a body or parameter reaches, by name. */
  schemas: Record<string, JsonSchema>;
}
