import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createSignozClient, createSignozClientFromEnv, type SignozClient } from "../client";
import { renameWithRetry } from "../fs-util";

/** The keys the saved configuration holds, in the order they are written. */
export const CONFIG_KEYS = [
  "SIGNOZ_BASE_URL",
  "SIGNOZ_API_KEY",
  "SIGNOZ_AUTH_TOKEN",
  "SIGNOZ_REFRESH_AUTH_TOKEN",
  "SIGNOZ_ENV",
  "PORT",
] as const;
export type ConfigKey = (typeof CONFIG_KEYS)[number];
export type ConfigValues = Partial<Record<ConfigKey, string>>;

export const DEFAULT_PORT = 3767;

type Env = Record<string, string | undefined>;

function homeOf(env: Env): string {
  return env.HOME || env.USERPROFILE || os.homedir();
}

/**
 * The per-user directory the saved configuration lives in: `$XDG_CONFIG_HOME/signoz`
 * (`~/.config/signoz`) on Linux, `~/Library/Application Support/signoz` on macOS and
 * `%APPDATA%\signoz` on Windows.
 */
export function configDir(env: Env = process.env, platform: NodeJS.Platform = process.platform): string {
  if (platform === "win32") {
    const appData = env.APPDATA || path.win32.join(homeOf(env), "AppData", "Roaming");
    return path.win32.join(appData, "signoz");
  }
  if (platform === "darwin") return path.join(homeOf(env), "Library", "Application Support", "signoz");
  return path.join(env.XDG_CONFIG_HOME || path.join(homeOf(env), ".config"), "signoz");
}

/** The saved `.env`: `SIGNOZ_CONFIG` when set, otherwise `<configDir>/.env`. */
export function configFilePath(env: Env = process.env, platform: NodeJS.Platform = process.platform): string {
  if (env.SIGNOZ_CONFIG) return path.resolve(env.SIGNOZ_CONFIG);
  const dir = configDir(env, platform);
  return platform === "win32" ? path.win32.join(dir, ".env") : path.join(dir, ".env");
}

/** Where a running server's pid file and log go: `run/` beside the saved `.env`. */
export function stateDir(configFile: string): string {
  return path.join(path.dirname(configFile), "run");
}

/** Where the rotated session tokens go: `session.json` beside the saved `.env`. */
export function sessionFilePath(configFile: string): string {
  return path.join(path.dirname(configFile), "session.json");
}

function unquote(value: string): string {
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) {
    const inner = value.slice(1, -1);
    return quote === '"' ? inner.replace(/\\n/g, "\n").replace(/\\(["\\])/g, "$1") : inner;
  }
  return value.replace(/\s+#.*$/, "");
}

/** `KEY=VALUE` lines, `#` comments and quoted values. Every key is kept, known or not. */
export function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (match) values[match[1]] = unquote(match[2].trim());
  }
  return values;
}

/** The saved configuration, or `{}` when there is no file yet. */
export function readEnvFile(file: string): ConfigValues {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  const parsed = parseEnv(text);
  const values: ConfigValues = {};
  for (const key of CONFIG_KEYS) if (parsed[key] !== undefined && parsed[key] !== "") values[key] = parsed[key];
  return values;
}

function quote(value: string): string {
  return /^[\w.:/@+-]*$/.test(value) ? value : `"${value.replace(/(["\\])/g, "\\$1").replace(/\n/g, "\\n")}"`;
}

/**
 * Write the known keys, readable by the owner only, replacing the file in one rename. On Windows
 * the mode is a no-op: `%APPDATA%` is already limited to its user by ACL.
 */
export function writeEnvFile(file: string, values: ConfigValues): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const body =
    "# SigNoz MCP server configuration, written by `signoz mcp config`.\n" +
    CONFIG_KEYS.filter((key) => values[key])
      .map((key) => `${key}=${quote(values[key] as string)}\n`)
      .join("");
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, body, { mode: 0o600 });
  renameWithRetry(temporary, file);
  fs.chmodSync(file, 0o600);
}

export interface McpConfigFlags {
  baseUrl?: string;
  apiKey?: string;
  authToken?: string;
  refreshAuthToken?: string;
  environment?: string;
  port?: string | number;
}

export interface McpConfig {
  /** `""` when no source gave one. */
  baseUrl: string;
  /** `""` when no source gave one. Wins over the session tokens. */
  apiKey: string;
  /** `""` when no source gave one. */
  authToken: string;
  /** `""` when no source gave one. */
  refreshAuthToken: string;
  /** The default `deployment.environment` the telemetry tools filter on, e.g. `production`. */
  environment?: string;
  port: number;
}

/** Parse and range-check a port; `0` means "pick a free one". */
export function parsePort(value: string | number): number {
  const port = typeof value === "number" ? value : /^\d+$/.test(value.trim()) ? Number(value) : Number.NaN;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError(`PORT must be an integer from 0 to 65535 (received '${String(value)}').`);
  }
  return port;
}

export function checkBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError();
  } catch {
    throw new TypeError(`SIGNOZ_BASE_URL is not a valid http(s) URL: '${value}'.`);
  }
  return value;
}

/**
 * The server's settings, each from the first source that has it:
 * **flag > process environment > saved `.env` > default**.
 */
export function resolveMcpConfig(sources: { flags?: McpConfigFlags; env?: Env; file?: ConfigValues }): McpConfig {
  const { flags = {}, env = {}, file = {} } = sources;
  const pick = (flag: string | number | undefined, key: ConfigKey): string | undefined => {
    for (const value of [flag, env[key], file[key]]) {
      const text = value === undefined ? "" : String(value).trim();
      if (text !== "") return text;
    }
    return undefined;
  };
  const baseUrl = pick(flags.baseUrl, "SIGNOZ_BASE_URL") ?? "";
  return {
    baseUrl: baseUrl === "" ? "" : checkBaseUrl(baseUrl),
    apiKey: pick(flags.apiKey, "SIGNOZ_API_KEY") ?? "",
    authToken: pick(flags.authToken, "SIGNOZ_AUTH_TOKEN") ?? "",
    refreshAuthToken: pick(flags.refreshAuthToken, "SIGNOZ_REFRESH_AUTH_TOKEN") ?? "",
    environment: pick(flags.environment, "SIGNOZ_ENV"),
    port: parsePort(pick(flags.port, "PORT") ?? DEFAULT_PORT),
  };
}

/** How the configuration authenticates, or `undefined` when it holds no usable credential. */
export function authOf(
  config: Pick<McpConfig, "apiKey" | "authToken" | "refreshAuthToken">
): "api_key" | "session" | undefined {
  if (config.apiKey) return "api_key";
  if (config.authToken && config.refreshAuthToken) return "session";
  return undefined;
}

/** Why the configuration cannot reach SigNoz yet, or `undefined` when it can. */
export function missingSettings(config: McpConfig): string | undefined {
  const missing: string[] = [];
  if (!config.baseUrl) missing.push("SIGNOZ_BASE_URL");
  if (!authOf(config)) missing.push("SIGNOZ_API_KEY (or SIGNOZ_AUTH_TOKEN and SIGNOZ_REFRESH_AUTH_TOKEN)");
  return missing.length === 0 ? undefined : `Missing ${missing.join(" and ")}.`;
}

/** The connection a transport needs: the SigNoz URL and one credential. */
export interface SignozConnection {
  baseUrl: string;
  apiKey?: string;
  authToken?: string;
  refreshAuthToken?: string;
  /**
   * Where rotated session tokens persist, so every process started from the same config shares
   * them. Ignored with an API key. Default: none (the pair lives in memory only).
   */
  sessionFile?: string;
}

/**
 * The SDK client for a connection: an API key when there is one, otherwise the session pair
 * (resumed from `sessionFile` when that file descends from the same pair).
 */
export function clientFor(connection: SignozConnection, fetchImpl?: typeof fetch): SignozClient {
  const { baseUrl, apiKey, authToken, refreshAuthToken, sessionFile } = connection;
  if (apiKey) return createSignozClient({ baseUrl, apiKey, fetch: fetchImpl });
  if (!authToken || !refreshAuthToken) {
    throw new TypeError(
      "A SigNoz credential is required: an API key (SIGNOZ_API_KEY), or the browser session pair " +
        "(SIGNOZ_AUTH_TOKEN and SIGNOZ_REFRESH_AUTH_TOKEN)."
    );
  }
  // fromEnv, not createSignozClient: it remembers which pair the saved file descends from, so a
  // pasted-in new pair wins over the file and an unchanged one resumes the rotated tokens.
  return createSignozClientFromEnv({
    env: {},
    baseUrl,
    authToken,
    refreshAuthToken,
    tokenFile: sessionFile ?? false,
    fetch: fetchImpl,
  });
}
