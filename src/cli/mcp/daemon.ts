import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { McpConfig, missingSettings, sessionFilePath, stateDir } from "../../mcp/config";
import { startSignozMcpServer } from "../../mcp/server";
import { CliInputError } from "../schema-args";
import { McpDeps } from "./deps";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** What a running server leaves in `<stateDir>/mcp.json`. */
export interface DaemonState {
  pid: number;
  port: number;
  url: string;
  startedAt: string;
  configFile: string;
  /** Guards `POST /shutdown`; absent in state files written before graceful stop existed. */
  shutdownToken?: string;
}

export function statePath(configFile: string): string {
  return path.join(stateDir(configFile), "mcp.json");
}

export function logPath(configFile: string): string {
  return path.join(stateDir(configFile), "mcp.log");
}

export function readState(configFile: string): DaemonState | undefined {
  try {
    return JSON.parse(fs.readFileSync(statePath(configFile), "utf8")) as DaemonState;
  } catch {
    return undefined;
  }
}

function writeState(configFile: string, state: DaemonState): void {
  fs.mkdirSync(stateDir(configFile), { recursive: true, mode: 0o700 });
  fs.writeFileSync(statePath(configFile), JSON.stringify(state, null, 2), { mode: 0o600 });
}

function removeState(configFile: string, pid?: number): void {
  // Only the owner removes it, so a late-exiting old server cannot erase a new one's state.
  if (pid !== undefined && readState(configFile)?.pid !== pid) return;
  fs.rmSync(statePath(configFile), { force: true });
}

/** Whether something answers HTTP on the port — any status counts; `/mcp` answers GET with 405. */
export function responds(port: number, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/mcp", timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
  });
}

/** The running server's state, or `undefined` — clearing a stale file whose process is gone. */
export function runningState(configFile: string, deps: McpDeps): DaemonState | undefined {
  const state = readState(configFile);
  if (state === undefined) return undefined;
  if (deps.isAlive(state.pid)) return state;
  removeState(configFile);
  return undefined;
}

function missingSettingsError(config: McpConfig): CliInputError | undefined {
  const missing = missingSettings(config);
  if (!missing) return undefined;
  return new CliInputError(
    `${missing} Run \`signoz mcp config\`, set them in the environment, or pass --base-url/--api-key for this run.`
  );
}

/**
 * Serve in this process until SIGINT/SIGTERM, recording the pid so `stop`/`status` find it.
 * This is what the detached `start` and the login service both run.
 */
export async function startForeground(
  config: McpConfig,
  configFile: string,
  deps: McpDeps,
  log: (text: string) => void
): Promise<void> {
  const missing = missingSettingsError(config);
  if (missing) throw missing;
  const existing = runningState(configFile, deps);
  if (existing) {
    throw new CliInputError(`The SigNoz MCP server is already running at ${existing.url} (pid ${existing.pid}).`);
  }
  const shutdownToken = randomBytes(32).toString("hex");
  let closing: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closing ??= (async () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      removeState(configFile, process.pid);
      await server.close();
    })();
    return closing;
  };
  const leave = (): void => {
    void close().then(() => deps.exit(0));
  };
  const onSignal = (): void => leave();

  const server = await startSignozMcpServer({
    ...config,
    sessionFile: sessionFilePath(configFile),
    shutdownToken,
    onShutdown: leave,
  });
  writeState(configFile, {
    pid: process.pid,
    port: server.port,
    url: server.url,
    startedAt: new Date().toISOString(),
    configFile,
    shutdownToken,
  });
  log(`SigNoz MCP server listening on ${server.url}`);
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  deps.onForeground?.(close);
}

function tail(file: string, lines = 15): string {
  try {
    return fs.readFileSync(file, "utf8").trimEnd().split("\n").slice(-lines).join("\n");
  } catch {
    return "";
  }
}

/**
 * Start the server as a detached background process. The resolved values reach it only
 * through its environment: nothing given on this command line is written to disk.
 */
export async function startDetached(
  config: McpConfig,
  configFile: string,
  deps: McpDeps,
  env: Record<string, string | undefined>,
  timeoutMs = 10_000
): Promise<DaemonState> {
  const missing = missingSettingsError(config);
  if (missing) throw missing;
  const existing = runningState(configFile, deps);
  if (existing) {
    throw new CliInputError(`The SigNoz MCP server is already running at ${existing.url} (pid ${existing.pid}).`);
  }

  fs.mkdirSync(stateDir(configFile), { recursive: true, mode: 0o700 });
  const logFile = logPath(configFile);
  const out = fs.openSync(logFile, "a", 0o600);
  const childEnv: Record<string, string | undefined> = {
    ...env,
    SIGNOZ_CONFIG: configFile,
    SIGNOZ_BASE_URL: config.baseUrl,
    SIGNOZ_API_KEY: config.apiKey,
    SIGNOZ_AUTH_TOKEN: config.authToken,
    SIGNOZ_REFRESH_AUTH_TOKEN: config.refreshAuthToken,
    SIGNOZ_ENV: config.environment,
    PORT: String(config.port),
  };
  for (const [key, value] of Object.entries(childEnv)) if (key.startsWith("SIGNOZ_") && !value) delete childEnv[key];

  let exited: number | null | undefined;
  let spawnError: Error | undefined;
  try {
    const child = deps.spawn(deps.nodePath, [deps.cliEntry, "mcp", "start", "--foreground"], {
      detached: true,
      stdio: ["ignore", out, out],
      env: childEnv as NodeJS.ProcessEnv,
      windowsHide: true,
    });
    child.once("exit", (code) => {
      exited = code;
    });
    child.once("error", (error) => {
      spawnError = error;
    });
    child.unref();

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (spawnError) throw new Error(`Could not start the server: ${spawnError.message}`);
      if (exited !== undefined) {
        const detail = tail(logFile);
        throw new Error(`The server exited (code ${String(exited)}).${detail ? `\n${detail}` : ""}`);
      }
      const state = readState(configFile);
      if (state && state.pid === child.pid && (await responds(state.port))) return state;
      await sleep(100);
    }
    throw new Error(`The server did not come up within ${timeoutMs / 1000}s; see ${logFile}.`);
  } finally {
    fs.closeSync(out);
  }
}

/** Ask a running server to leave: `undefined` when it answered 202, otherwise why not. */
export function requestShutdown(port: number, token: string, timeoutMs = 2000): Promise<string | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (reason: string | undefined): void => {
      if (settled) return;
      settled = true;
      resolve(reason);
    };
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/shutdown",
        method: "POST",
        headers: { "X-Signoz-Shutdown": token },
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        settle(res.statusCode === 202 ? undefined : `POST /shutdown answered ${res.statusCode}`);
      }
    );
    req.on("timeout", () => {
      settle(`POST /shutdown got no answer within ${timeoutMs / 1000}s`);
      req.destroy();
    });
    req.on("error", (error) => settle(`POST /shutdown failed: ${error.message}`));
    req.end();
  });
}

async function waitForExit(pid: number, deps: McpDeps, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (deps.isAlive(pid)) {
    if (Date.now() >= deadline) return false;
    await sleep(100);
  }
  return true;
}

export interface StoppedServer {
  state: DaemonState;
  /** Whether it left through `/shutdown` rather than being killed. */
  graceful: boolean;
}

/**
 * Stop the running server: through `POST /shutdown` when its state file has a token (the same
 * on every platform — on Windows a signal is `TerminateProcess`, which runs no cleanup), then
 * with a signal if that fails. Answers `undefined` if none was running.
 */
export async function stopServer(
  configFile: string,
  deps: McpDeps,
  timeoutMs = 5000,
  warn: (text: string) => void = () => undefined
): Promise<StoppedServer | undefined> {
  const state = runningState(configFile, deps);
  if (state === undefined) return undefined;
  let failed: string | undefined;
  if (state.shutdownToken) {
    failed = await requestShutdown(state.port, state.shutdownToken);
    if (failed === undefined && !(await waitForExit(state.pid, deps, timeoutMs))) {
      failed = `the server accepted POST /shutdown, but pid ${state.pid} was still running after ${timeoutMs / 1000}s`;
    }
  }
  const graceful = Boolean(state.shutdownToken) && failed === undefined;
  if (!graceful) {
    deps.kill(state.pid, "SIGTERM");
    if (!(await waitForExit(state.pid, deps, timeoutMs))) {
      const why = failed ? ` (graceful stop failed first: ${failed})` : "";
      throw new Error(`pid ${state.pid} did not stop within ${timeoutMs / 1000}s${why}.`);
    }
    if (failed) warn(`Graceful stop failed (${failed}); terminated pid ${state.pid}.`);
  }
  removeState(configFile, state.pid);
  return { state, graceful };
}

export function formatUptime(since: string, now = Date.now()): string {
  let seconds = Math.max(0, Math.round((now - Date.parse(since)) / 1000));
  const parts: string[] = [];
  for (const [unit, size] of [
    ["d", 86_400],
    ["h", 3600],
    ["m", 60],
  ] as const) {
    if (seconds >= size) {
      parts.push(`${Math.floor(seconds / size)}${unit}`);
      seconds %= size;
    }
  }
  if (parts.length === 0 || seconds > 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}
