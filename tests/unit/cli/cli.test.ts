import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runCli, splitGlobalFlags } from "../../../src/cli/run";
import { RunningSignozMcpServer, startSignozMcpServer } from "../../../src/mcp";
import { writeEnvFile } from "../../../src/mcp/config";
import type { McpDeps } from "../../../src/cli/mcp/deps";
import { FakeSignoz, type Seen, envelope } from "../fake-server";

let home: string;
let configFile: string;
let running: RunningSignozMcpServer | undefined;
let signoz: FakeSignoz;
let BASE: string;

/** A SigNoz that knows who is calling and answers query_range with one raw log row. */
function answer(seen: Seen): Response {
  if (seen.path === "/api/v1/service_accounts/me") return envelope({ id: "sa1", name: "ci" });
  if (seen.path === "/api/v2/users/me") return envelope({ id: "u1", email: "ada@example.com", displayName: "Ada" });
  if (seen.path === "/api/v5/query_range") {
    return envelope({
      type: "raw",
      data: {
        results: [
          {
            queryName: "A",
            rows: [
              {
                timestamp: "2026-09-25T12:00:00Z",
                data: { body: "boom", severity_text: "ERROR", resources_string: { "service.name": "point-api" } },
              },
            ],
          },
        ],
      },
    });
  }
  return envelope({});
}

beforeEach(async () => {
  signoz = await FakeSignoz.start((_req, seen) => answer(seen));
  BASE = signoz.url;
  home = fs.mkdtempSync(path.join(os.tmpdir(), "signoz-cli-"));
  configFile = path.join(home, ".env");
  writeEnvFile(configFile, { SIGNOZ_API_KEY: "saved", SIGNOZ_BASE_URL: BASE });
});
afterEach(async () => {
  await running?.close();
  running = undefined;
  await signoz.stop();
  fs.rmSync(home, { recursive: true, force: true });
});

async function cli(argv: string[], env: Record<string, string | undefined> = {}, deps: Partial<McpDeps> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(
    argv,
    {
      stdout: (text) => out.push(text),
      stderr: (text) => err.push(text),
      // Never the developer's own saved configuration.
      env: { SIGNOZ_CONFIG: configFile, ...env },
    },
    deps
  );
  return { code, stdout: out.join("\n"), stderr: err.join("\n") };
}

function queryBodies(): { compositeQuery: { queries: { spec: Record<string, unknown> }[] }; requestType: string }[] {
  return signoz.seen.filter((s) => s.path === "/api/v5/query_range").map((s) => JSON.parse(s.body));
}

describe("signoz CLI", () => {
  it("refuses every command until `signoz mcp config` has saved a configuration", async () => {
    fs.rmSync(configFile);
    running = await startSignozMcpServer({ port: 0, baseUrl: BASE, apiKey: "server-key" });
    for (const argv of [
      ["tools"],
      ["whoami"],
      ["whoami", "--api-key", "k"],
      ["whoami", "--url", running.url],
      ["mcp", "stop"],
      ["mcp", "status"],
      ["mcp", "boot", "status"],
    ]) {
      const result = await cli(argv, { SIGNOZ_API_KEY: "from-env", SIGNOZ_BASE_URL: BASE });
      expect({ argv, code: result.code }).toEqual({ argv, code: 1 });
      expect(result.stderr).toContain(`No saved configuration at ${configFile}: run \`signoz mcp config\` first.`);
      expect(result.stdout).toBe("");
    }
    expect(signoz.seen).toEqual([]);
  });

  it("still prints help and the version before anything is configured", async () => {
    fs.rmSync(configFile);
    for (const argv of [[], ["--help"], ["whoami", "--help"], ["mcp"], ["mcp", "config", "--help"], ["--version"]]) {
      const result = await cli(argv);
      expect({ argv, code: result.code, stderr: result.stderr }).toEqual({ argv, code: 0, stderr: "" });
    }
  });

  it("opens the documentation site with `signoz docs`, configured or not", async () => {
    fs.rmSync(configFile);
    const opened: string[] = [];
    const result = await cli(["docs"], {}, { openBrowser: async (url) => void opened.push(url) });
    expect(result).toEqual({ code: 0, stdout: "https://hoyasumii.github.io/signoz/", stderr: "" });
    expect(opened).toEqual(["https://hoyasumii.github.io/signoz/"]);
  });

  it("still prints the link when `signoz docs` cannot open a browser", async () => {
    const result = await cli(["docs"], {}, { openBrowser: () => Promise.reject(new Error("no browser")) });
    expect(result).toEqual({
      code: 0,
      stdout: "https://hoyasumii.github.io/signoz/",
      stderr: "Could not open a browser; open the link above.",
    });
  });

  it("describes `signoz docs` in the usage without opening anything", async () => {
    const opened: string[] = [];
    const openBrowser = async (url: string) => void opened.push(url);
    expect((await cli(["--help"], {}, { openBrowser })).stdout).toMatch(/`docs`\s+Open the documentation/);
    expect((await cli(["docs", "--help"], {}, { openBrowser })).code).toBe(0);
    expect(opened).toEqual([]);
  });

  it("refuses a saved configuration without a URL or a credential", async () => {
    for (const saved of [
      { SIGNOZ_BASE_URL: BASE },
      { SIGNOZ_API_KEY: "k" },
      { SIGNOZ_BASE_URL: BASE, SIGNOZ_AUTH_TOKEN: "a" },
    ]) {
      writeEnvFile(configFile, saved);
      const result = await cli(["tools"], { SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "from-env" });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("run `signoz mcp config` first");
    }
  });

  it("accepts a saved browser session instead of an API key", async () => {
    writeEnvFile(configFile, { SIGNOZ_BASE_URL: BASE, SIGNOZ_AUTH_TOKEN: "a1", SIGNOZ_REFRESH_AUTH_TOKEN: "r1" });
    const result = await cli(["whoami"]);
    expect(result).toMatchObject({ code: 0, stderr: "" });
    expect(result.stdout).toContain('"auth": "session"');
    expect(result.stdout).toContain('"email": "ada@example.com"');
    expect(signoz.seen[0]?.authorization).toBe("Bearer a1");
  });

  it("lists the MCP tools as commands once configured", async () => {
    const result = await cli(["tools"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/^whoami\s+SigNoz connection$/m);
    expect(result.stdout).toMatch(/^search-logs\s+/m);
    expect(result.stdout).toMatch(/^create-dashboard\s+/m);
    expect(result.stdout).toMatch(/^call\s+/m);
  });

  it("lists each tool by its title in the root help, with no padding for the terminal to wrap", async () => {
    const root = await cli(["--help"]);
    expect(root.code).toBe(0);
    expect(root.stdout).toMatch(/`search-logs`\s+Search logs$/m);
    expect(root.stdout).not.toMatch(/[ \t]$/m);

    const tool = await cli(["search-logs", "--help"]);
    expect(tool.stdout).toContain("Latest log lines matching a service");
    expect(tool.stdout).not.toMatch(/[ \t]$/m);
  });

  it("takes an ISO 8601 or an epoch window start", async () => {
    for (const start of ["2026-09-25T11:00:00-03:00", "1790340000000"]) {
      const result = await cli(["search-logs", "--start", start]);
      expect({ start, code: result.code, stderr: result.stderr }).toEqual({ start, code: 0, stderr: "" });
    }
    expect(queryBodies().map((body) => (body as unknown as { start: number }).start)).toEqual([
      1790344800000, 1790340000000,
    ]);
  });

  it("runs a tool in-process with the key from the environment", async () => {
    const result = await cli(["whoami"], { SIGNOZ_API_KEY: "secret" });
    expect(result).toMatchObject({ code: 0, stderr: "" });
    expect(result.stdout).toContain('"auth": "api_key"');
    expect(result.stdout).toContain('"name": "ci"');
    expect(signoz.seen[0]?.apiKey).toBe("secret");
  });

  it("coerces flags into the tool's arguments", async () => {
    const result = await cli(
      ["search-logs", "--service", "point-api", "--severity", "ERROR,FATAL", "--limit", "5", "--since=30m"],
      { SIGNOZ_ENV: "production" }
    );
    expect(result.stderr).toBe("");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('"body": "boom"');
    const [body] = queryBodies();
    expect(body.requestType).toBe("raw");
    const spec = body.compositeQuery.queries[0].spec;
    expect(spec.limit).toBe(5);
    expect(spec.filter).toEqual({
      expression:
        "deployment.environment = 'production' AND service.name = 'point-api' AND severity_text IN ('ERROR', 'FATAL')",
    });
  });

  it("uses the saved API key when no flag or environment variable overrides it", async () => {
    const result = await cli(["whoami"]);
    expect(result).toMatchObject({ code: 0, stderr: "" });
    expect(signoz.seen[0]?.apiKey).toBe("saved");
  });

  it("reports tool errors on stderr with exit code 1", async () => {
    const result = await cli(["call", "--operation", "dashboard.deleteDashboardV2", "--args", '{"path":{"id":"d1"}}']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("is destructive; call again with confirm: true");
    expect(signoz.seen).toEqual([]);
  });

  it("prints usage for a missing required flag or an unknown command", async () => {
    const missing = await cli(["get-trace"]);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("Missing required argument: --trace-id");
    expect(missing.stderr).toContain("USAGE");

    const unknown = await cli(["nope"]);
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain("Unknown command `nope`");
  });

  it("connects to a running signoz-mcp with --url", async () => {
    running = await startSignozMcpServer({ port: 0, baseUrl: BASE, apiKey: "server-key" });
    const result = await cli(["whoami", "--url", running.url]);
    expect(result).toMatchObject({ code: 0, stderr: "" });
    expect(result.stdout).toContain('"auth": "api_key"');
    expect(signoz.seen[0]?.apiKey).toBe("server-key");
  });

  it("takes the connection flags from anywhere on the line", () => {
    expect(
      splitGlobalFlags(["--url=http://x/mcp", "search-logs", "--api-key", "k", "--env", "prod", "--service", "a"])
    ).toEqual({
      options: { url: "http://x/mcp", apiKey: "k", environment: "prod" },
      rest: ["search-logs", "--service", "a"],
    });
    expect(() => splitGlobalFlags(["whoami", "--base-url"])).toThrow("--base-url needs a value.");
  });
});
