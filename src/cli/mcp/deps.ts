import { ChildProcess, SpawnOptions } from "node:child_process";
import crossSpawn from "cross-spawn";
import * as fs from "node:fs";
import * as path from "node:path";
import { PickerTerminal } from "./picker";

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface ExecOptions {
  /** Kill the command and answer code 124 when it runs longer than this. */
  timeoutMs?: number;
}

/** A child process as much of it as `signoz mcp start` uses. */
export interface SpawnedProcess {
  pid?: number;
  unref(): void;
  once(event: "exit", listener: (code: number | null) => void): unknown;
  once(event: "error", listener: (error: Error) => void): unknown;
}

/** Everything `signoz mcp` does to the operating system, so tests can stand in for it. */
export interface McpDeps {
  platform: NodeJS.Platform;
  /** The Node binary that runs the CLI, for the detached server and the login service. */
  nodePath: string;
  /** The compiled `signoz` entry point (`dist/cli/index.js`). */
  cliEntry: string;
  spawn(command: string, args: string[], options: SpawnOptions): SpawnedProcess;
  /**
   * Run a command to completion through `cross-spawn`, so `.cmd`/`.bat` shims work on Windows.
   * Never throws: a missing binary answers code 127, a timeout 124.
   */
  exec(command: string, args: string[], options?: ExecOptions): Promise<ExecResult>;
  openBrowser(url: string): Promise<void>;
  isAlive(pid: number): boolean;
  kill(pid: number, signal: NodeJS.Signals): void;
  /** The uid launchd's `gui/<uid>` domain needs on macOS. */
  uid(): number;
  /** Leave the process; `process.exit` by default, a stand-in in tests. */
  exit(code: number): void;
  /** Whether this process runs inside WSL (`/proc/version` names Microsoft). */
  isWsl(): boolean;
  /** Receives the in-process server `start --foreground` leaves running; tests use it to stop it. */
  onForeground?(close: () => Promise<void>): void;
  /** The interactive terminal, when stdin and stdout are both one; `signoz mcp install` needs it for its picker. */
  terminal?: PickerTerminal;
}

function execCommand(command: string, args: string[], options: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const finish = (result: ExecResult): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };
    let child: ChildProcess;
    try {
      child = crossSpawn(command, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      finish({ code: 127, stdout: "", stderr: error instanceof Error ? error.message : String(error) });
      return;
    }
    if (options.timeoutMs !== undefined) {
      timer = setTimeout(() => {
        // The child may be a wrapper (cmd.exe for every .cmd shim): on Windows take its whole tree
        // down, and everywhere let go of the pipes, which a surviving grandchild would keep open.
        if (process.platform === "win32" && child.pid !== undefined) {
          crossSpawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on(
            "error",
            () => undefined
          );
        } else {
          child.kill();
        }
        child.stdout?.destroy();
        child.stderr?.destroy();
        child.unref();
        finish({ code: 124, stdout, stderr: stderr || `${command} timed out after ${options.timeoutMs} ms` });
      }, options.timeoutMs);
    }
    child.stdout?.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr?.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    // On Windows, cross-spawn turns cmd.exe's "not recognized" exit into this same ENOENT error.
    child.on("error", (error: NodeJS.ErrnoException) =>
      finish({ code: error.code === "ENOENT" ? 127 : 1, stdout, stderr: stderr || error.message })
    );
    child.on("close", (code) => finish({ code: code ?? 1, stdout, stderr }));
  });
}

function isWsl(): boolean {
  try {
    return /microsoft/i.test(fs.readFileSync("/proc/version", "utf8"));
  } catch {
    return false;
  }
}

async function openBrowser(url: string, platform: NodeJS.Platform): Promise<void> {
  const attempts: [string, string[]][] =
    platform === "win32"
      ? [["cmd", ["/c", "start", '""', url]]]
      : platform === "darwin"
        ? [["open", [url]]]
        : isWsl()
          ? [
              ["wslview", [url]],
              ["cmd.exe", ["/c", "start", '""', url]],
              ["xdg-open", [url]],
            ]
          : [["xdg-open", [url]]];
  for (const [command, args] of attempts) {
    if ((await execCommand(command, args)).code === 0) return;
  }
  throw new Error("could not open a browser");
}

export function defaultMcpDeps(): McpDeps {
  const platform = process.platform;
  return {
    platform,
    nodePath: process.execPath,
    // Compiled, this file is dist/cli/mcp/deps.js and the entry point is dist/cli/index.js.
    cliEntry: path.join(__dirname, "..", "index.js"),
    spawn: (command, args, options) => crossSpawn(command, args, options),
    exec: execCommand,
    openBrowser: (url) => openBrowser(url, platform),
    isAlive(pid) {
      try {
        process.kill(pid, 0);
        return true;
      } catch (error) {
        // EPERM: it exists, it is just not ours to signal.
        return (error as NodeJS.ErrnoException).code === "EPERM";
      }
    },
    kill: (pid, signal) => process.kill(pid, signal),
    uid: () => (typeof process.getuid === "function" ? process.getuid() : 0),
    exit: (code) => process.exit(code),
    isWsl,
    terminal:
      process.stdin.isTTY && process.stdout.isTTY ? { input: process.stdin, output: process.stdout } : undefined,
  };
}
