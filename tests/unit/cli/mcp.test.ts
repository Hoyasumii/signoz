import * as fs from "node:fs";
import * as http from "node:http";
import { AddressInfo } from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { SpawnOptions } from "node:child_process";
import { PassThrough } from "node:stream";
import { runCli } from "../../../src/cli/run";
import { ExecResult, McpDeps, SpawnedProcess } from "../../../src/cli/mcp/deps";
import { readState, statePath, stopServer } from "../../../src/cli/mcp/daemon";
import { launchdPlist, systemdUnit, windowsScripts } from "../../../src/cli/mcp/boot";
import { RunningSignozMcpServer, startSignozMcpServer } from "../../../src/mcp";
import { readEnvFile, writeEnvFile } from "../../../src/mcp/config";
import { formPage, savedPage } from "../../../src/cli/mcp/config-page";

const BASE = "https://api.example.com";

let home: string;
let configFile: string;
let closers: (() => Promise<void>)[];

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "signoz-mcp-cli-"));
  configFile = path.join(home, ".config", "signoz", ".env");
  closers = [];
});
afterEach(async () => {
  for (const close of closers) await close();
  fs.rmSync(home, { recursive: true, force: true });
});

function fakeDeps(overrides: Partial<McpDeps> = {}): Partial<McpDeps> & { execs: string[][] } {
  const execs: string[][] = [];
  return {
    platform: "linux",
    nodePath: "/usr/bin/node",
    cliEntry: "/opt/signoz/dist/cli/index.js",
    exec: async (command: string, args: string[]): Promise<ExecResult> => {
      execs.push([command, ...args]);
      return { code: 0, stdout: args.includes("is-enabled") ? "enabled\n" : "", stderr: "" };
    },
    openBrowser: async () => undefined,
    uid: () => 501,
    exit: () => undefined,
    isWsl: () => false,
    onForeground: (close) => closers.push(close),
    ...overrides,
    execs,
  };
}

async function cli(argv: string[], deps: Partial<McpDeps> = fakeDeps(), env: Record<string, string> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(
    argv,
    { stdout: (text) => out.push(text), stderr: (text) => err.push(text), env: { HOME: home, ...env } },
    deps
  );
  return { code, stdout: out.join("\n"), stderr: err.join("\n") };
}

describe("signoz mcp", () => {
  it("prints its usage without connecting anywhere", async () => {
    const result = await cli(["mcp"]);
    expect(result.code).toBe(0);
    for (const command of ["start", "stop", "status", "boot", "config"]) expect(result.stdout).toContain(command);
    expect((await cli(["--help"])).stdout).toContain("mcp");
  });

  it("refuses to start without a saved configuration, even given a key", async () => {
    for (const argv of [
      ["mcp", "start"],
      ["mcp", "start", "--foreground", "--api-key", "k"],
    ]) {
      const result = await cli(argv, fakeDeps(), { SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "from-env" });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain(`No saved configuration at ${configFile}: run \`signoz mcp config\` first.`);
    }
    expect(fs.existsSync(configFile)).toBe(false);
  });

  it("runs in the foreground from the saved config, and reports it in status", async () => {
    writeEnvFile(configFile, { SIGNOZ_API_KEY: "saved", SIGNOZ_BASE_URL: BASE, PORT: "0" });
    const started = await cli(["mcp", "start", "--foreground"]);
    expect(started).toMatchObject({ code: 0 });
    expect(started.stderr).toMatch(/listening on http:\/\/127\.0\.0\.1:\d+\/mcp/);
    const state = readState(configFile);
    expect(state?.pid).toBe(process.pid);

    const status = await cli(["mcp", "status"]);
    expect(status.code).toBe(0);
    expect(status.stdout).toContain(`running     ${state?.url} (pid ${process.pid}`);
    expect(status.stdout).not.toContain("not answering");
    expect(status.stdout).toContain(`config      ${configFile}`);

    const again = await cli(["mcp", "start", "--foreground"]);
    expect(again.code).toBe(1);
    expect(again.stderr).toContain("already running");

    await closers.pop()?.();
    expect(fs.existsSync(statePath(configFile))).toBe(false);
    expect((await cli(["mcp", "status"])).code).toBe(3);
  });

  it("starts in the background with one-off values it never saves, then stops", async () => {
    writeEnvFile(configFile, { SIGNOZ_API_KEY: "saved", SIGNOZ_BASE_URL: BASE, SIGNOZ_ENV: "acme" });
    const before = fs.readFileSync(configFile, "utf8");
    const alive = new Set<number>();
    let server: RunningSignozMcpServer | undefined;
    let spawned: { command: string; args: string[]; env: Record<string, string | undefined> } | undefined;

    const deps = fakeDeps({
      isAlive: (pid) => alive.has(pid),
      kill: (pid) => {
        alive.delete(pid);
        void server?.close();
      },
      spawn(command: string, args: string[], options: SpawnOptions): SpawnedProcess {
        const env = options.env as Record<string, string | undefined>;
        spawned = { command, args, env };
        const pid = 424242;
        alive.add(pid);
        // Stand in for the detached `mcp start --foreground`: serve and record the state.
        void startSignozMcpServer({
          port: 0,
          baseUrl: env.SIGNOZ_BASE_URL ?? "",
          apiKey: env.SIGNOZ_API_KEY ?? "",
        }).then((running) => {
          server = running;
          fs.writeFileSync(
            statePath(configFile),
            JSON.stringify({ pid, port: running.port, url: running.url, startedAt: new Date().toISOString() })
          );
        });
        return { pid, unref: () => undefined, once: () => undefined };
      },
    });

    const started = await cli(["mcp", "start", "--api-key", "one-off", "--port", "0"], deps, {
      SIGNOZ_ENV: "from-env",
    });
    expect(started.stderr).toBe("");
    expect(started.code).toBe(0);
    expect(started.stdout).toContain("claude mcp add --transport http signoz http://127.0.0.1:");
    expect(spawned?.command).toBe("/usr/bin/node");
    expect(spawned?.args).toEqual(["/opt/signoz/dist/cli/index.js", "mcp", "start", "--foreground"]);
    expect(spawned?.env).toMatchObject({
      SIGNOZ_API_KEY: "one-off",
      SIGNOZ_BASE_URL: BASE,
      SIGNOZ_ENV: "from-env",
      PORT: "0",
      SIGNOZ_CONFIG: configFile,
    });
    expect(fs.readFileSync(configFile, "utf8")).toBe(before);

    expect((await cli(["mcp", "start"], deps)).stderr).toContain("already running");

    const stopped = await cli(["mcp", "stop"], deps);
    expect(stopped.stdout).toBe("Stopped the SigNoz MCP server (pid 424242).");
    // A state file without a shutdown token (as older versions wrote) goes straight to kill, quietly.
    expect(stopped.stderr).toBe("");
    expect(fs.existsSync(statePath(configFile))).toBe(false);
    expect((await cli(["mcp", "stop"], deps)).stdout).toBe("The SigNoz MCP server is not running.");
  });

  it("clears a state file whose process is gone", async () => {
    writeEnvFile(configFile, { SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "saved" });
    fs.mkdirSync(path.dirname(statePath(configFile)), { recursive: true });
    fs.writeFileSync(statePath(configFile), JSON.stringify({ pid: 1, port: 1, url: "x", startedAt: "" }));
    const status = await cli(["mcp", "status"], fakeDeps({ isAlive: () => false }));
    expect(status.code).toBe(3);
    expect(status.stdout).toMatch(/^stopped/);
    expect(fs.existsSync(statePath(configFile))).toBe(false);
  });

  it("honours --config", async () => {
    const other = path.join(home, "elsewhere.env");
    writeEnvFile(other, { SIGNOZ_API_KEY: "k", SIGNOZ_BASE_URL: BASE, PORT: "0" });
    expect((await cli(["mcp", "start", "--foreground", "--config", other])).code).toBe(0);
    expect(readState(other)?.pid).toBe(process.pid);
    expect(readState(configFile)).toBeUndefined();
  });

  it("stops a foreground server gracefully through its shutdown token", async () => {
    writeEnvFile(configFile, { SIGNOZ_API_KEY: "saved", SIGNOZ_BASE_URL: BASE });
    let exited = false;
    const kills: number[] = [];
    const deps = fakeDeps({
      isAlive: (pid) => pid === process.pid && !exited,
      kill: (pid) => kills.push(pid),
      exit: () => {
        exited = true;
      },
    });
    expect((await cli(["mcp", "start", "--foreground", "--port", "0"], deps)).code).toBe(0);
    expect(readState(configFile)?.shutdownToken).toMatch(/^[0-9a-f]{64}$/);

    const stopped = await cli(["mcp", "stop"], deps);
    expect(stopped.stdout).toBe(`Stopped the SigNoz MCP server (pid ${process.pid}).`);
    expect(stopped.stderr).toBe("");
    expect(exited).toBe(true);
    expect(kills).toEqual([]);
    expect(fs.existsSync(statePath(configFile))).toBe(false);
  });

  it("falls back to kill, and says so, when the graceful stop gets no answer", async () => {
    writeEnvFile(configFile, { SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "saved" });
    const alive = new Set([4242]);
    fs.mkdirSync(path.dirname(statePath(configFile)), { recursive: true });
    fs.writeFileSync(
      statePath(configFile),
      JSON.stringify({
        pid: 4242,
        port: 1,
        url: "http://127.0.0.1:1/mcp",
        startedAt: new Date().toISOString(),
        configFile,
        shutdownToken: "t",
      })
    );
    const deps = fakeDeps({ isAlive: (pid) => alive.has(pid), kill: (pid) => alive.delete(pid) });
    const stopped = await cli(["mcp", "stop"], deps);
    expect(stopped.stdout).toBe("Stopped the SigNoz MCP server (pid 4242).");
    expect(stopped.stderr).toMatch(
      /^Graceful stop failed \(POST \/shutdown failed: connect ECONNREFUSED 127\.0\.0\.1:1\); terminated pid 4242\.$/
    );
  });

  it("says so when the server accepts the graceful stop and does not leave", async () => {
    const accepting = http.createServer((_req, res) => res.writeHead(202).end());
    await new Promise<void>((resolve) => accepting.listen(0, "127.0.0.1", resolve));
    closers.push(() => new Promise((resolve) => accepting.close(() => resolve())));
    const port = (accepting.address() as AddressInfo).port;
    writeEnvFile(configFile, { SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "saved" });
    fs.mkdirSync(path.dirname(statePath(configFile)), { recursive: true });
    fs.writeFileSync(
      statePath(configFile),
      JSON.stringify({ pid: 4242, port, url: "", startedAt: new Date().toISOString(), configFile, shutdownToken: "t" })
    );
    const alive = new Set([4242]);
    const warnings: string[] = [];
    const deps = fakeDeps({ isAlive: (pid) => alive.has(pid), kill: (pid) => alive.delete(pid) }) as McpDeps;
    const stopped = await stopServer(configFile, deps, 300, (text) => warnings.push(text));
    expect(stopped?.graceful).toBe(false);
    expect(warnings).toEqual([
      "Graceful stop failed (the server accepted POST /shutdown, but pid 4242 was still running after 0.3s); terminated pid 4242.",
    ]);
  });
});

describe("signoz mcp boot", () => {
  beforeEach(() => writeEnvFile(configFile, { SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "saved" }));

  it("installs, reports and removes a systemd user unit on Linux", async () => {
    const deps = fakeDeps();
    const unit = path.join(home, ".config", "systemd", "user", "hoyasumii-signoz-mcp.service");

    const enabled = await cli(["mcp", "boot", "enable"], deps);
    expect(enabled.code).toBe(0);
    expect(enabled.stdout).toContain(unit);
    expect(fs.readFileSync(unit, "utf8")).toBe(systemdUnit(deps as McpDeps, configFile));
    expect(deps.execs).toEqual([
      ["systemctl", "--user", "show-environment"],
      ["systemctl", "--user", "daemon-reload"],
      ["systemctl", "--user", "enable", "hoyasumii-signoz-mcp.service"],
    ]);

    expect((await cli(["mcp", "boot", "status"], deps)).stdout).toBe(`enabled (${unit})`);
    expect((await cli(["mcp", "boot", "disable"], deps)).code).toBe(0);
    expect(fs.existsSync(unit)).toBe(false);
    expect((await cli(["mcp", "boot", "status"], deps)).code).toBe(3);
  });

  it("never overwrites or removes a service it did not write", async () => {
    const deps = fakeDeps();
    const unit = path.join(home, ".config", "systemd", "user", "hoyasumii-signoz-mcp.service");
    fs.mkdirSync(path.dirname(unit), { recursive: true });
    fs.writeFileSync(unit, "[Service]\nExecStart=/somebody/else\n");

    for (const verb of ["enable", "disable"]) {
      const result = await cli(["mcp", "boot", verb], deps);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("was not written by `signoz mcp boot`");
    }
    expect((await cli(["mcp", "boot", "status"], deps)).stdout).toContain("not written by signoz mcp boot");
    expect(fs.readFileSync(unit, "utf8")).toBe("[Service]\nExecStart=/somebody/else\n");
    expect(deps.execs).toEqual([]);
  });

  it("explains a missing systemd user session", async () => {
    const deps = fakeDeps({ exec: async () => ({ code: 1, stdout: "", stderr: "Failed to connect to bus" }) });
    const result = await cli(["mcp", "boot", "enable"], deps);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("systemd=true");
    expect(fs.existsSync(path.join(home, ".config", "systemd"))).toBe(false);
  });

  it("writes a service that runs start --foreground with only SIGNOZ_CONFIG", () => {
    const deps = fakeDeps() as McpDeps;
    const unit = systemdUnit(deps, "/home/a b/.config/signoz/.env");
    expect(unit).toContain('Environment="SIGNOZ_CONFIG=/home/a b/.config/signoz/.env"');
    expect(unit).toContain('ExecStart="/usr/bin/node" "/opt/signoz/dist/cli/index.js" mcp start --foreground');

    const plist = launchdPlist(deps, "/Users/a/Library/Application Support/signoz/.env");
    expect(plist).toContain("<string>io.github.hoyasumii.signoz-mcp</string>");
    expect(plist).toContain("<string>--foreground</string>");
    expect(plist).toContain("<key>RunAtLoad</key>");

    const scripts = windowsScripts(deps, "C:\\cfg\\.env", "C:\\cfg\\signoz-mcp.cmd");
    expect(scripts.cmd).toContain('set "SIGNOZ_CONFIG=C:\\cfg\\.env"');
    expect(scripts.vbs).toContain('"""C:\\cfg\\signoz-mcp.cmd""", 0, False');
  });

  it("uses launchctl on macOS and schtasks on Windows", async () => {
    const mac = fakeDeps({ platform: "darwin" });
    writeEnvFile(path.join(home, "Library", "Application Support", "signoz", ".env"), {
      SIGNOZ_BASE_URL: BASE,
      SIGNOZ_API_KEY: "saved",
    });
    await cli(["mcp", "boot", "enable"], mac);
    expect(fs.existsSync(path.join(home, "Library", "LaunchAgents", "io.github.hoyasumii.signoz-mcp.plist"))).toBe(
      true
    );
    expect(mac.execs.at(-1)).toEqual([
      "launchctl",
      "bootstrap",
      "gui/501",
      path.join(home, "Library", "LaunchAgents", "io.github.hoyasumii.signoz-mcp.plist"),
    ]);

    const win = fakeDeps({ platform: "win32" });
    const winConfig = path.join(home, "AppData", "signoz", ".env");
    writeEnvFile(winConfig, { SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "saved" });
    const result = await cli(["mcp", "boot", "enable"], win, { SIGNOZ_CONFIG: winConfig });
    expect(result.stderr).toBe("");
    expect(fs.readdirSync(path.join(home, "AppData", "signoz")).sort()).toEqual([
      ".env",
      "run",
      "signoz-mcp.cmd",
      "signoz-mcp.vbs",
    ]);
    expect(win.execs.at(-1)?.slice(0, 7)).toEqual([
      "schtasks",
      "/Create",
      "/TN",
      "HoyasumiiSignozMCP",
      "/SC",
      "ONLOGON",
      "/TR",
    ]);
  });
});

describe("signoz mcp config --web", () => {
  async function openForm(env: Record<string, string> = {}) {
    let url = "";
    let result: ReturnType<typeof cli> = Promise.resolve({ code: -1, stdout: "", stderr: "" });
    const opened = new Promise<void>((resolve) => {
      const deps = fakeDeps({
        openBrowser: async (link) => {
          url = link;
          resolve();
        },
      });
      result = cli(["mcp", "config", "--web"], deps, env);
    });
    await opened;
    return { url, result: () => result };
  }

  function post(url: string, fields: Record<string, string>): Promise<Response> {
    return fetch(new URL("/save", url), {
      method: "POST",
      body: new URLSearchParams(fields),
      redirect: "manual",
    });
  }

  it("serves a Tailwind form, saves it, and redirects to a confirmation", async () => {
    writeEnvFile(configFile, { SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "old-key", SIGNOZ_ENV: "<acme>" });
    const { url, result } = await openForm();
    const token = new URL(url).searchParams.get("t") ?? "";

    const form = await fetch(url);
    expect(form.status).toBe(200);
    const html = await form.text();
    expect(html).toContain('<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>');
    expect(html).toContain(`name="t" value="${token}"`);
    expect(html).toContain('value="&lt;acme&gt;"');
    expect(html).not.toContain("old-key");

    expect((await fetch(new URL("/", url))).status).toBe(403);
    expect((await post(url, { t: "wrong", SIGNOZ_API_KEY: "x" })).status).toBe(403);

    const invalid = await post(url, { t: token, SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "", PORT: "99999" });
    expect(invalid.status).toBe(400);
    expect(await invalid.text()).toContain("PORT must be a number");

    const saved = await post(url, {
      t: token,
      SIGNOZ_API_KEY: "",
      SIGNOZ_BASE_URL: BASE,
      SIGNOZ_ENV: "acme",
      PORT: "4000",
    });
    expect(saved.status).toBe(303);
    const location = saved.headers.get("location") ?? "";
    expect(location).toBe(`/saved?t=${token}`);
    expect(readEnvFile(configFile)).toEqual({
      SIGNOZ_API_KEY: "old-key",
      SIGNOZ_BASE_URL: BASE,
      SIGNOZ_ENV: "acme",
      PORT: "4000",
    });

    const confirmation = await fetch(new URL(location, url));
    expect(await confirmation.text()).toContain("Settings saved");
    const done = await result();
    expect(done.code).toBe(0);
    expect(done.stdout).toContain(`Saved ${configFile}.`);
  });

  it("requires a URL and a credential when none is saved", async () => {
    const { url, result } = await openForm();
    const token = new URL(url).searchParams.get("t") ?? "";
    const noUrl = await post(url, { t: token, SIGNOZ_API_KEY: "new" });
    expect(await noUrl.text()).toContain("SIGNOZ_BASE_URL is required");
    const response = await post(url, { t: token, SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: " ", SIGNOZ_AUTH_TOKEN: "a" });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("A credential is required");
    expect(fs.existsSync(configFile)).toBe(false);
    expect((await fetch(new URL(`/saved?t=${token}`, url))).status).toBe(404);
    await post(url, { t: token, SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "new" });
    await fetch(new URL(`/saved?t=${token}`, url));
    expect((await result()).code).toBe(0);
    expect(readEnvFile(configFile)).toEqual({ SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "new" });
  });
});

describe("signoz mcp config", () => {
  /** A fake raw-mode terminal; each entry answers one prompt, in order. */
  function terminal(answers: string[]) {
    const input = Object.assign(new PassThrough(), {
      isRaw: false,
      setRawMode(mode: boolean) {
        this.isRaw = mode;
      },
    });
    const output = new PassThrough();
    let written = "";
    output.on("data", (chunk: Buffer) => (written += chunk.toString()));
    for (const answer of answers) input.write(answer);
    // oxlint-disable-next-line no-control-regex -- strips the prompts' ANSI codes
    return { input, output, text: () => written.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "") };
  }

  it("asks in the terminal, starting from the saved values", async () => {
    writeEnvFile(configFile, { SIGNOZ_API_KEY: "old-key", SIGNOZ_ENV: "acme", PORT: "4000" });
    // URL: typed. Key: enter keeps it (so no session tokens are asked). Env: enter keeps it. Port: Ctrl+U back to the default.
    const term = terminal([`${BASE}\r`, "\r", "\r", "\x15\r"]);
    const result = await cli(["mcp", "config"], fakeDeps({ terminal: term }));
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Saved ${configFile}.`);
    expect(readEnvFile(configFile)).toEqual({
      SIGNOZ_API_KEY: "old-key",
      SIGNOZ_BASE_URL: BASE,
      SIGNOZ_ENV: "acme",
    });
    const text = term.text();
    expect(text).not.toContain("old-key");
    expect(text).toContain("✔ SIGNOZ_API_KEY kept");
    expect(text).toContain("✔ PORT 3767 (default)");
  });

  it("requires a URL and refuses invalid values in place", async () => {
    const term = terminal(["\r", "ftp://x\r", `\x15${BASE}\r`, "new-key\r", "\r", "0\r", "\x7f\r"]);
    const result = await cli(["mcp", "config"], fakeDeps({ terminal: term }));
    expect(result.code).toBe(0);
    expect(readEnvFile(configFile)).toEqual({ SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "new-key" });
    expect(term.text()).toContain("SIGNOZ_BASE_URL is required.");
    expect(term.text()).toContain("SIGNOZ_BASE_URL must be a valid http(s) URL.");
    expect(term.text()).toContain("PORT must be a number from 1 to 65535.");
  });

  it("saves nothing when a prompt is cancelled", async () => {
    writeEnvFile(configFile, { SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "old-key" });
    const before = fs.readFileSync(configFile, "utf8");
    const result = await cli(["mcp", "config"], fakeDeps({ terminal: terminal(["new\r", "\x03"]) }));
    expect(result.code).toBe(130);
    expect(result.stderr).toContain("Nothing was saved.");
    expect(fs.readFileSync(configFile, "utf8")).toBe(before);
  });

  it("asks for the browser session pair when there is no API key", async () => {
    const term = terminal([`${BASE}\r`, "\r", "\r", "a1\r", "r1\r", "production\r", "\r"]);
    const result = await cli(["mcp", "config"], fakeDeps({ terminal: term }));
    expect(result.code).toBe(0);
    expect(readEnvFile(configFile)).toEqual({
      SIGNOZ_BASE_URL: BASE,
      SIGNOZ_AUTH_TOKEN: "a1",
      SIGNOZ_REFRESH_AUTH_TOKEN: "r1",
      SIGNOZ_ENV: "production",
    });
    expect(term.text()).toContain("SIGNOZ_AUTH_TOKEN is required without an API key.");
    expect(term.text()).not.toContain("a1");
  });

  it("saves the flags given without asking, keeping everything else", async () => {
    writeEnvFile(configFile, { SIGNOZ_API_KEY: "old-key", SIGNOZ_ENV: "acme", PORT: "4000" });
    const result = await cli(["mcp", "config", "--base-url", BASE, "--port="]);
    expect(result.code).toBe(0);
    expect(readEnvFile(configFile)).toEqual({
      SIGNOZ_API_KEY: "old-key",
      SIGNOZ_BASE_URL: BASE,
      SIGNOZ_ENV: "acme",
    });

    expect((await cli(["mcp", "config", "--api-key", "new-key", "--env="])).code).toBe(0);
    expect(readEnvFile(configFile)).toEqual({ SIGNOZ_API_KEY: "new-key", SIGNOZ_BASE_URL: BASE });
  });

  it("refuses flags it cannot save, and saves nothing", async () => {
    for (const [argv, message] of [
      [["--base-url", BASE], "A credential is required"],
      [["--base-url", BASE, "--auth-token", "a"], "A credential is required"],
      [["--api-key", "k"], "SIGNOZ_BASE_URL is required."],
      [["--api-key", "k", "--base-url", BASE, "--port", "99999"], "PORT must be a number from 1 to 65535."],
      [["--api-key", "k", "--base-url", "nope"], "SIGNOZ_BASE_URL must be a valid http(s) URL."],
      [["--web", "--api-key", "k"], "--web takes no values"],
    ] as const) {
      const result = await cli(["mcp", "config", ...argv]);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain(message);
    }
    expect(fs.existsSync(configFile)).toBe(false);
  });

  it("refuses to ask without an interactive terminal", async () => {
    const result = await cli(["mcp", "config"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("No interactive terminal to ask in: pass --base-url and --api-key");
    expect(fs.existsSync(configFile)).toBe(false);
  });

  it("tells a running server to restart", async () => {
    writeEnvFile(configFile, { SIGNOZ_BASE_URL: BASE, SIGNOZ_API_KEY: "old-key" });
    fs.mkdirSync(path.dirname(statePath(configFile)), { recursive: true });
    fs.writeFileSync(
      statePath(configFile),
      JSON.stringify({ pid: 4242, port: 3767, url: "http://127.0.0.1:3767/mcp", startedAt: "", configFile })
    );
    const result = await cli(["mcp", "config", "--env", "acme"], fakeDeps({ isAlive: (pid) => pid === 4242 }));
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("still has the old settings; restart it: signoz mcp stop && signoz mcp start");
  });
});

describe("signoz mcp config page", () => {
  const page = (hasSavedKey: boolean): string =>
    formPage({
      token: "tok",
      values: {},
      saved: hasSavedKey ? { SIGNOZ_API_KEY: "saved" } : {},
      configFile: "/tmp/signoz/.env",
    });
  const input = (html: string, name: string): string => new RegExp(`<input name="${name}"[^>]*>`).exec(html)?.[0] ?? "";

  it("requires the URL; the secrets are never echoed and a saved one shows as kept", () => {
    expect(input(page(false), "SIGNOZ_BASE_URL")).toMatch(/\srequired\s/);
    expect(input(page(false), "SIGNOZ_API_KEY")).not.toContain("required");
    expect(input(page(true), "SIGNOZ_API_KEY")).toContain('value=""');
    expect(input(page(true), "SIGNOZ_API_KEY")).toContain("saved — blank keeps it, - clears it");
    expect(input(page(false), "SIGNOZ_API_KEY")).not.toContain("saved");
  });

  it("gates Save on the required fields and styles it as clickable only when enabled", () => {
    const html = page(false);
    const button = /<button id="save"[^>]*>/.exec(html)?.[0] ?? "";
    expect(button).toContain("cursor-pointer");
    expect(button).toContain("transition-all");
    expect(button).toContain("disabled:cursor-not-allowed");
    expect(button).not.toMatch(/\sdisabled[\s>]/);
    expect(html).toContain('querySelectorAll("input[required]")');
    expect(html).toContain('input.value.trim() === ""');
  });

  it("follows the system color scheme", () => {
    for (const html of [page(false), savedPage("/tmp/signoz/.env")]) {
      expect(html).toContain('<meta name="color-scheme" content="light dark">');
      expect(html).toContain("dark:bg-slate-950");
    }
  });
});
