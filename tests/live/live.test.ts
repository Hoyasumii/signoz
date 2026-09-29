/**
 * Against a real instance. Runs only with SIGNOZ_LIVE=1 and SIGNOZ_BASE_URL plus SIGNOZ_API_KEY (or
 * SIGNOZ_AUTH_TOKEN and SIGNOZ_REFRESH_AUTH_TOKEN), read from `.env.test`: `pnpm test:live`.
 *
 * Read-only, unless SIGNOZ_LIVE_WRITE=1: then it creates a test dashboard from the presets, checks
 * that SigNoz accepted it and deletes it at the end. SIGNOZ_LIVE_SERVICE picks the presets' service
 * (default: the one with the most spans in the last hour).
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createSignozClientFromEnv } from "../../src/index";
import { buildSignozMcpServer } from "../../src/mcp";

const env = process.env;
const configured = Boolean(
  env.SIGNOZ_LIVE === "1" &&
  env.SIGNOZ_BASE_URL &&
  (env.SIGNOZ_API_KEY || (env.SIGNOZ_AUTH_TOKEN && env.SIGNOZ_REFRESH_AUTH_TOKEN))
);
const writes = configured && env.SIGNOZ_LIVE_WRITE === "1";

(configured ? describe : describe.skip)("real instance", () => {
  const signoz = configured ? createSignozClientFromEnv({ tokenFile: false }) : undefined;
  let mcp: Client;

  beforeAll(async () => {
    if (!signoz) return;
    const server = buildSignozMcpServer(signoz, { environment: env.SIGNOZ_ENV });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    mcp = new Client({ name: "live", version: "0" });
    await mcp.connect(clientSide);
  });
  afterAll(async () => mcp?.close());

  // oxlint-disable-next-line typescript/no-explicit-any -- the tools' JSON is walked freely
  async function call(name: string, args: Record<string, unknown> = {}): Promise<any> {
    const result = await mcp.callTool({ name, arguments: args });
    const text = (result.content as { text: string }[]).map((part) => part.text).join("");
    if (result.isError) throw new Error(`${name}: ${text}`);
    return JSON.parse(text);
  }

  test("signoz_whoami", async () => {
    const me = await call("signoz_whoami");
    expect(me.baseUrl).toBe(signoz?.baseUrl);
    // oxlint-disable-next-line no-console
    console.log(`authenticated by ${me.auth}: ${me.user?.email ?? JSON.stringify(me.serviceAccount)}`);
  });

  test("dashboards v2", async () => {
    const page = await call("signoz_list_dashboards", { limit: 5 });
    expect(typeof page.total).toBe("number");
  });

  let service: string | undefined = env.SIGNOZ_LIVE_SERVICE;

  test("signoz_list_services and log and span searches", async () => {
    const { services } = await call("signoz_list_services", { since: "1h", environment: "all" });
    expect(Array.isArray(services)).toBe(true);
    service ??= services[0]?.service;
    // oxlint-disable-next-line no-console
    console.log(
      `services: ${services
        .slice(0, 10)
        .map((s: { service: string }) => s.service)
        .join(", ")}`
    );
    if (!service) return;
    await call("signoz_search_traces", { service, since: "1h", environment: "all", limit: 3 });
    await call("signoz_search_logs", { service, since: "1h", environment: "all", limit: 3 });
  });

  test("the presets' panels pass SigNoz's check (dryRun)", async () => {
    if (!service) return;
    const result = await call("signoz_create_dashboard", {
      title: "signoz-sdk live check",
      presets: [
        { preset: "api_red", service, environment: "all" },
        { preset: "worker_failures", service, environment: "all" },
        { preset: "logs_errors", service, environment: "all" },
      ],
      dryRun: true,
    });
    expect(result.failedPanels ?? []).toEqual([]);
  });

  (writes ? test : test.skip)("creates the dashboard, SigNoz accepts it, and deletes it", async () => {
    if (!service) return;
    const created = await call("signoz_create_dashboard", {
      title: `signoz-sdk live ${new Date().toISOString().slice(0, 16)}`,
      tags: ["source:signoz-sdk-live"],
      presets: [
        { preset: "api_red", service, environment: "all" },
        { preset: "worker_failures", service, environment: "all" },
      ],
    });
    expect(created.saved).toBe(true);
    try {
      const summary = await call("signoz_get_dashboard", { id: created.id });
      expect(summary.sections.length).toBe(2);
      // oxlint-disable-next-line no-console
      console.log(`created and checked: ${created.url}`);
    } finally {
      await call("signoz_call", {
        operation: "dashboard.deleteDashboardV2",
        args: { path: { id: created.id } },
        confirm: true,
      });
    }
  });
});
