import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { logPath } from "./daemon";
import { McpDeps } from "./deps";

/**
 * Start the server at login, as a service of the current user — no sudo or admin:
 * a systemd user unit on Linux, a LaunchAgent on macOS, a logon task on Windows.
 *
 * The service runs `signoz mcp start --foreground` with only `SIGNOZ_CONFIG` set, so it
 * reads the saved configuration; values given once on a `start` command line never reach it.
 */
export interface BootStatus {
  enabled: boolean;
  /** Where the service definition lives (or would). */
  location: string;
  /** A definition exists there that `signoz mcp boot` did not write; it is never touched. */
  foreign?: boolean;
}

type Env = Record<string, string | undefined>;

// Named for this package, so they cannot collide with another tool's "signoz-mcp" service.
export const SYSTEMD_UNIT = "hoyasumii-signoz-mcp.service";
export const LAUNCHD_LABEL = "io.github.hoyasumii.signoz-mcp";
export const WINDOWS_TASK = "HoyasumiiSignozMCP";

/** Written into every file `boot enable` creates; a file without it is someone else's. */
export const BOOT_MARKER = "Managed by `signoz mcp boot`";

function isForeign(file: string): boolean {
  try {
    return !fs.readFileSync(file, "utf8").includes(BOOT_MARKER);
  } catch {
    return false;
  }
}

function refuseForeign(file: string): void {
  if (isForeign(file)) {
    throw new Error(`${file} exists and was not written by \`signoz mcp boot\`; remove or rename it first.`);
  }
}

function home(env: Env): string {
  return env.HOME || env.USERPROFILE || os.homedir();
}

function systemdUnitPath(env: Env): string {
  return path.join(env.XDG_CONFIG_HOME || path.join(home(env), ".config"), "systemd", "user", SYSTEMD_UNIT);
}

function launchdPlistPath(env: Env): string {
  return path.join(home(env), "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`);
}

/** Beside the saved `.env`, which on Windows is already under `%APPDATA%\\signoz`. */
function windowsFiles(configFile: string): { cmd: string; vbs: string } {
  const dir = path.dirname(configFile);
  return { cmd: path.join(dir, "signoz-mcp.cmd"), vbs: path.join(dir, "signoz-mcp.vbs") };
}

/** systemd's own quoting: double quotes, with `\` and `"` escaped and `%` doubled. */
function systemdQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/%/g, "%%")}"`;
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function systemdUnit(deps: McpDeps, configFile: string): string {
  return [
    `# ${BOOT_MARKER}.`,
    "[Unit]",
    "Description=SigNoz MCP server",
    "After=network-online.target",
    "",
    "[Service]",
    "Type=simple",
    `Environment=${systemdQuote(`SIGNOZ_CONFIG=${configFile}`)}`,
    `ExecStart=${systemdQuote(deps.nodePath)} ${systemdQuote(deps.cliEntry)} mcp start --foreground`,
    "Restart=on-failure",
    "RestartSec=5",
    "",
    "[Install]",
    "WantedBy=default.target",
    "",
  ].join("\n");
}

export function launchdPlist(deps: McpDeps, configFile: string): string {
  const args = [deps.nodePath, deps.cliEntry, "mcp", "start", "--foreground"];
  const log = xmlEscape(logPath(configFile));
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- ${BOOT_MARKER}. -->
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${args.map((arg) => `    <string>${xmlEscape(arg)}</string>`).join("\n")}
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>SIGNOZ_CONFIG</key>
    <string>${xmlEscape(configFile)}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${log}</string>
  <key>StandardErrorPath</key>
  <string>${log}</string>
</dict>
</plist>
`;
}

/** The batch file the logon task runs, and the script that runs it without a console window. */
export function windowsScripts(deps: McpDeps, configFile: string, cmdPath: string): { cmd: string; vbs: string } {
  return {
    cmd: [
      "@echo off",
      `rem ${BOOT_MARKER}.`,
      `set "SIGNOZ_CONFIG=${configFile}"`,
      `"${deps.nodePath}" "${deps.cliEntry}" mcp start --foreground >> "${logPath(configFile)}" 2>&1`,
      "",
    ].join("\r\n"),
    vbs: `' ${BOOT_MARKER}.\r\nCreateObject("WScript.Shell").Run """${cmdPath.replace(/"/g, '""')}""", 0, False\r\n`,
  };
}

async function run(deps: McpDeps, command: string, args: string[], hint = ""): Promise<string> {
  const result = await deps.exec(command, args);
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    throw new Error(`\`${command} ${args.join(" ")}\` failed${detail ? `: ${detail}` : ""}.${hint}`);
  }
  return result.stdout;
}

const SYSTEMD_HINT =
  "\nA systemd user session is required. On WSL, enable systemd (`[boot] systemd=true` in /etc/wsl.conf, " +
  "then `wsl --shutdown`).";

export async function enableBoot(deps: McpDeps, env: Env, configFile: string): Promise<BootStatus> {
  switch (deps.platform) {
    case "darwin": {
      const plist = launchdPlistPath(env);
      refuseForeign(plist);
      fs.mkdirSync(path.dirname(plist), { recursive: true });
      fs.mkdirSync(path.dirname(logPath(configFile)), { recursive: true, mode: 0o700 });
      // Replacing a loaded agent needs it unloaded first; failing to unload one that is not loaded is fine.
      await deps.exec("launchctl", ["bootout", `gui/${deps.uid()}/${LAUNCHD_LABEL}`]);
      fs.writeFileSync(plist, launchdPlist(deps, configFile));
      await run(deps, "launchctl", ["bootstrap", `gui/${deps.uid()}`, plist]);
      return { enabled: true, location: plist };
    }
    case "win32": {
      const files = windowsFiles(configFile);
      refuseForeign(files.cmd);
      refuseForeign(files.vbs);
      fs.mkdirSync(path.dirname(files.cmd), { recursive: true });
      fs.mkdirSync(path.dirname(logPath(configFile)), { recursive: true });
      const scripts = windowsScripts(deps, configFile, files.cmd);
      fs.writeFileSync(files.cmd, scripts.cmd);
      fs.writeFileSync(files.vbs, scripts.vbs);
      await run(deps, "schtasks", [
        "/Create",
        "/TN",
        WINDOWS_TASK,
        "/SC",
        "ONLOGON",
        "/TR",
        `wscript.exe "${files.vbs}"`,
        "/F",
      ]);
      return { enabled: true, location: `Task Scheduler: ${WINDOWS_TASK}` };
    }
    default: {
      const unit = systemdUnitPath(env);
      refuseForeign(unit);
      // Check systemd is reachable before leaving a unit file behind.
      await run(deps, "systemctl", ["--user", "show-environment"], SYSTEMD_HINT);
      fs.mkdirSync(path.dirname(unit), { recursive: true });
      fs.writeFileSync(unit, systemdUnit(deps, configFile));
      await run(deps, "systemctl", ["--user", "daemon-reload"], SYSTEMD_HINT);
      await run(deps, "systemctl", ["--user", "enable", SYSTEMD_UNIT], SYSTEMD_HINT);
      return { enabled: true, location: unit };
    }
  }
}

export async function disableBoot(deps: McpDeps, env: Env, configFile: string): Promise<BootStatus> {
  switch (deps.platform) {
    case "darwin": {
      const plist = launchdPlistPath(env);
      refuseForeign(plist);
      await deps.exec("launchctl", ["bootout", `gui/${deps.uid()}/${LAUNCHD_LABEL}`]);
      fs.rmSync(plist, { force: true });
      return { enabled: false, location: plist };
    }
    case "win32": {
      const files = windowsFiles(configFile);
      refuseForeign(files.cmd);
      if ((await deps.exec("schtasks", ["/Query", "/TN", WINDOWS_TASK])).code === 0) {
        await run(deps, "schtasks", ["/Delete", "/TN", WINDOWS_TASK, "/F"]);
      }
      fs.rmSync(files.cmd, { force: true });
      fs.rmSync(files.vbs, { force: true });
      return { enabled: false, location: `Task Scheduler: ${WINDOWS_TASK}` };
    }
    default: {
      const unit = systemdUnitPath(env);
      refuseForeign(unit);
      if (fs.existsSync(unit)) {
        await run(deps, "systemctl", ["--user", "disable", SYSTEMD_UNIT], SYSTEMD_HINT);
        fs.rmSync(unit, { force: true });
        await run(deps, "systemctl", ["--user", "daemon-reload"], SYSTEMD_HINT);
      }
      return { enabled: false, location: unit };
    }
  }
}

export async function bootStatus(deps: McpDeps, env: Env): Promise<BootStatus> {
  switch (deps.platform) {
    case "darwin": {
      const plist = launchdPlistPath(env);
      if (isForeign(plist)) return { enabled: false, location: plist, foreign: true };
      return { enabled: fs.existsSync(plist), location: plist };
    }
    case "win32": {
      const result = await deps.exec("schtasks", ["/Query", "/TN", WINDOWS_TASK]);
      return { enabled: result.code === 0, location: `Task Scheduler: ${WINDOWS_TASK}` };
    }
    default: {
      const unit = systemdUnitPath(env);
      if (!fs.existsSync(unit)) return { enabled: false, location: unit };
      if (isForeign(unit)) return { enabled: false, location: unit, foreign: true };
      const result = await deps.exec("systemctl", ["--user", "is-enabled", SYSTEMD_UNIT]);
      return { enabled: result.stdout.trim() === "enabled", location: unit };
    }
  }
}
