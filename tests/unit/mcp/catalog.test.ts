import * as fs from "node:fs";
import { CATALOG_FILE, buildCatalog, renderCatalog } from "../../../scripts/build-mcp-catalog";
import {
  CATALOG,
  describeOperation,
  describeSchema,
  findOperation,
  renderSchema,
  searchCatalog,
} from "../../../src/mcp/catalog";
import { OPERATIONS } from "../../../src/generated/operations";

describe("MCP catalog", () => {
  it("is up to date with the spec (run `pnpm codegen:mcp` when this fails)", () => {
    expect(fs.readFileSync(CATALOG_FILE, "utf8")).toBe(renderCatalog(buildCatalog()));
  });

  it("covers every operation but the session lifecycle, the SSO callbacks and the raw export", () => {
    const reached = new Set(CATALOG.operations.map((op) => op.operationId));
    const left = Object.keys(OPERATIONS)
      .filter((id) => !reached.has(id))
      .sort();
    expect(left).toEqual([
      "CreateSessionByEmailPassword",
      "CreateSessionByGoogleCallback",
      "CreateSessionByOIDCCallback",
      "CreateSessionBySAMLCallback",
      "DeleteSession",
      "HandleExportRawDataPOST",
      "RotateSession",
    ]);
  });

  it("marks deletes and revocations destructive, queries read-only and notifications writes", () => {
    const kind = (id: string) => CATALOG.operations.find((op) => op.operationId === id)?.kind;
    expect(kind("DeleteDashboardV2")).toBe("destructive");
    expect(kind("RevokeServiceAccountKey")).toBe("destructive");
    expect(kind("QueryRangeV5")).toBe("read");
    expect(kind("GetWaterfallV4")).toBe("read");
    expect(kind("CreateDashboardV2")).toBe("write");
    expect(kind("TestChannel")).toBe("write");
  });

  it("finds an operation by service.method or operationId, and suggests close names", () => {
    expect(findOperation("dashboard.listDashboardsV2").operationId).toBe("ListDashboardsV2");
    expect(findOperation("ListDashboardsV2").method).toBe("listDashboardsV2");
    expect(() => findOperation("dashboard.nope")).toThrow("Unknown operation");
  });

  it("searches by words and lists services without a query", () => {
    expect(searchCatalog()).toContain("- dashboard: ");
    const found = searchCatalog("saved view");
    expect(found).toContain("savedView.createSavedView [write] POST /api/v2/saved_views");
    expect(searchCatalog("zzz-nothing")).toContain("No operation matches");
  });

  it("describes parameters, the body schema and an example call", () => {
    const text = describeOperation("dashboard.getDashboardV2");
    expect(text).toContain("GET /api/v2/dashboards/{id}");
    expect(text).toContain("args.path:\n- id: string");
    expect(text).toContain('"operation":"dashboard.getDashboardV2"');
    const del = describeOperation("DeleteDashboardV2");
    expect(del).toContain("Destructive: signoz_call requires `confirm: true`.");
    const create = describeOperation("CreateDashboardV2", 2);
    expect(create).toContain("args.body (optional):");
    expect(create).toContain("schemaVersion: string");
  });

  it("renders schemas, stopping at cycles and at the requested depth", () => {
    expect(renderSchema({ type: "array", items: { type: "string" } })).toBe("string[]");
    expect(renderSchema({ enum: ["a", "b"] })).toBe('"a" | "b"');
    expect(renderSchema({ $ref: "#/components/schemas/DashboardtypesPanel" }, 0)).toBe("DashboardtypesPanel");
    expect(describeSchema("DashboardtypesDisplay")).toContain("name: string");
    expect(() => describeSchema("NoSuchSchema")).toThrow("Unknown schema");
  });
});
