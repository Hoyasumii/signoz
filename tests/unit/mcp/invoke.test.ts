import { createSignozClient } from "../../../src/client";
import { MAX_RESULT_CHARS, invoke, toResultText } from "../../../src/mcp/invoke";
import { FakeSignoz, envelope } from "../fake-server";

let server: FakeSignoz;
beforeEach(async () => {
  server = await FakeSignoz.start((_req, seen) => envelope({ path: seen.path, search: seen.search }));
});
afterEach(async () => server.stop());

const client = () => createSignozClient({ baseUrl: server.url, apiKey: "k" });

describe("invoke", () => {
  it("calls the SDK method with path, query and body", async () => {
    const result = await invoke(client(), "dashboard.getDashboardV2", { args: { path: { id: "d1" } } });
    expect(result).toEqual({ path: "/api/v2/dashboards/d1", search: "" });
    await invoke(client(), "ListDashboardsV2", { args: { query: { limit: 5 } } });
    expect(server.seen.at(-1)?.search).toBe("?limit=5");
    await invoke(client(), "savedView.createSavedView", { args: { body: { name: "v" } } });
    expect(JSON.parse(server.seen.at(-1)?.body ?? "{}")).toEqual({ name: "v" });
  });

  it("calls an operation without parameters with no arguments", async () => {
    await invoke(client(), "rules.listRules");
    expect(server.seen.at(-1)?.path).toBe("/api/v2/rules");
  });

  it("refuses a destructive operation without confirm, and runs it with", async () => {
    await expect(invoke(client(), "dashboard.deleteDashboardV2", { args: { path: { id: "d1" } } })).rejects.toThrow(
      "is destructive; call again with confirm: true"
    );
    expect(server.seen).toEqual([]);
    await invoke(client(), "dashboard.deleteDashboardV2", { args: { path: { id: "d1" } }, confirm: true });
    expect(server.seen.at(-1)?.method).toBe("DELETE");
  });

  it("refuses unknown or missing parameters before any request", async () => {
    await expect(invoke(client(), "dashboard.getDashboardV2", { args: {} })).rejects.toThrow("needs args.path.id");
    await expect(
      invoke(client(), "dashboard.getDashboardV2", { args: { path: { id: "d1", other: 1 } } })
    ).rejects.toThrow("Unknown path parameter(s) for dashboard.getDashboardV2: other");
    await expect(invoke(client(), "rules.listRules", { args: { body: {} } })).rejects.toThrow("takes no body");
    await expect(invoke(client(), "rules.listRules", { args: { headers: {} } as never })).rejects.toThrow(
      "args takes path, query and body only"
    );
    await expect(invoke(client(), "sessions.rotateSession")).rejects.toThrow("Unknown operation");
    expect(server.seen).toEqual([]);
  });
});

describe("toResultText", () => {
  it("passes strings through and cuts long results", () => {
    expect(toResultText("plain")).toBe("plain");
    const long = toResultText({ text: "x".repeat(MAX_RESULT_CHARS + 10) });
    expect(long).toContain("[truncated:");
  });
});
