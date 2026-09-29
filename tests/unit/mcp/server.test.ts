import { createServer, request } from "node:http";
import { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { RunningSignozMcpServer, SERVER_VERSION, startSignozMcpServer } from "../../../src/mcp";
import { hostAllowed } from "../../../src/mcp/server";
import { FakeSignoz, envelope, renderError } from "../fake-server";

let running: RunningSignozMcpServer | undefined;
let signoz: FakeSignoz;
let BASE: string;
beforeEach(async () => {
  signoz = await FakeSignoz.start((_req, seen) => {
    if (seen.path === "/api/v1/service_accounts/me") return envelope({ id: "sa1", name: "ci" });
    if (seen.path === "/api/v2/rules") return renderError(403, "forbidden", "not allowed", "forbidden");
    return envelope({});
  });
  BASE = signoz.url;
});
afterEach(async () => {
  await running?.close();
  running = undefined;
  await signoz.stop();
});

async function connect(url: string): Promise<Client> {
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  return client;
}

function text(result: Awaited<ReturnType<Client["callTool"]>>): string {
  return (result.content as { type: string; text: string }[]).map((part) => part.text).join("");
}

describe("startSignozMcpServer", () => {
  it("serves the tools over Streamable HTTP and calls SigNoz with the given key", async () => {
    running = await startSignozMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret" });
    expect(running.url).toBe(`http://127.0.0.1:${running.port}/mcp`);

    const client = await connect(running.url);
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "signoz_whoami",
        "signoz_list_services",
        "signoz_search_logs",
        "signoz_search_traces",
        "signoz_get_trace",
        "signoz_query",
        "signoz_list_alerts",
        "signoz_create_dashboard",
        "signoz_resources",
        "signoz_describe",
        "signoz_call",
      ])
    );

    const result = await client.callTool({ name: "signoz_whoami", arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toContain('"name": "ci"');
    expect(signoz.seen[0]?.apiKey).toBe("secret");
    await client.close();
  });

  it("reports API errors as tool errors, with what to check", async () => {
    running = await startSignozMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret" });
    const client = await connect(running.url);
    const result = await client.callTool({ name: "signoz_list_rules", arguments: {} });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("SigNoz answered 403");
    expect(text(result)).toContain("lacks the permission");
    expect(text(result)).not.toContain("secret");
    await client.close();
  });

  it("rejects bad arguments and a port already in use", async () => {
    await expect(startSignozMcpServer({ port: 70000, baseUrl: BASE, apiKey: "k" })).rejects.toThrow("port must be");
    await expect(startSignozMcpServer({ port: 0, baseUrl: "", apiKey: "k" })).rejects.toThrow("baseUrl is required");
    await expect(startSignozMcpServer({ port: 0, baseUrl: "not a url", apiKey: "k" })).rejects.toThrow(
      "not a valid URL"
    );
    await expect(startSignozMcpServer({ port: 0, baseUrl: BASE, apiKey: "" })).rejects.toThrow(
      "A credential is required"
    );

    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", resolve));
    const { port } = blocker.address() as AddressInfo;
    await expect(startSignozMcpServer({ port, baseUrl: BASE, apiKey: "k" })).rejects.toThrow(/EADDRINUSE/);
    await new Promise<void>((resolve) => blocker.close(() => resolve()));
  });

  it("refuses a Host other than loopback (DNS rebinding)", async () => {
    running = await startSignozMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret" });
    const status = await new Promise<number>((resolve, reject) => {
      const req = request(
        { host: "127.0.0.1", port: running!.port, path: "/mcp", method: "POST", headers: { host: "evil.example" } },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        }
      );
      req.on("error", reject);
      req.end("{}");
    });
    expect(status).toBe(403);
    expect(hostAllowed("localhost:3767")).toBe(true);
    expect(hostAllowed("127.0.0.1")).toBe(true);
    expect(hostAllowed("[::1]:3767")).toBe(true);
    expect(hostAllowed("127.0.0.1.evil.example")).toBe(false);
    expect(hostAllowed(undefined)).toBe(false);
  });

  it("answers GET /health with the instance, the auth mode and the environment", async () => {
    running = await startSignozMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret", environment: "production" });
    const response = await fetch(running.url.replace("/mcp", "/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      baseUrl: BASE,
      auth: "api_key",
      environment: "production",
      version: SERVER_VERSION,
    });
  });

  it("answers 404 off the endpoint and 405 for GET", async () => {
    running = await startSignozMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret" });
    expect((await fetch(running.url.replace("/mcp", "/other"))).status).toBe(404);
    expect((await fetch(running.url)).status).toBe(405);
  });
});

describe("POST /shutdown", () => {
  async function post(url: string, token?: string): Promise<number> {
    const response = await fetch(new URL("/shutdown", url), {
      method: "POST",
      headers: token === undefined ? {} : { "X-Signoz-Shutdown": token },
    });
    return response.status;
  }

  it("answers 202 and calls onShutdown for the right token, 403 for any other", async () => {
    let shutdowns = 0;
    running = await startSignozMcpServer({
      port: 0,
      baseUrl: BASE,
      apiKey: "k",
      shutdownToken: "s3cret",
      onShutdown: () => shutdowns++,
    });
    expect(await post(running.url)).toBe(403);
    expect(await post(running.url, "wrong")).toBe(403);
    expect(await post(running.url, "s3cret-and-more")).toBe(403);
    expect(shutdowns).toBe(0);
    expect(await post(running.url, "s3cret")).toBe(202);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(shutdowns).toBe(1);
  });

  it("closes the server itself when given a token and no onShutdown", async () => {
    running = await startSignozMcpServer({ port: 0, baseUrl: BASE, apiKey: "k", shutdownToken: "s3cret" });
    expect(await post(running.url, "s3cret")).toBe(202);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(fetch(new URL("/health", running.url))).rejects.toThrow();
  });

  it("refuses every request when the server has no token", async () => {
    running = await startSignozMcpServer({ port: 0, baseUrl: BASE, apiKey: "k" });
    expect(await post(running.url, "")).toBe(403);
    expect(await post(running.url, "anything")).toBe(403);
  });
});
