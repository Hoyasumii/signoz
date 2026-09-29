#!/usr/bin/env node
/**
 * `signoz-mcp`: run the MCP server in the foreground — over stdio by default, the way an MCP
 * client launches it, or over Streamable HTTP with `--http`.
 *
 *   signoz-mcp                                  # stdio: the client spawns this and talks on stdin/stdout
 *   PORT=3767 signoz-mcp --http                 # http://127.0.0.1:3767/mcp
 *
 * Anything the environment leaves out comes from the saved configuration
 * (`signoz mcp config`), then the defaults.
 */
import { configFilePath, missingSettings, readEnvFile, resolveMcpConfig, sessionFilePath } from "./config";
import { startSignozMcpServer } from "./server";
import { serveSignozMcpStdio } from "./stdio";

export type SignozMcpMode = "stdio" | "http" | "help";

const USAGE = `Usage: signoz-mcp [--stdio | --http] [--help]

Run the SigNoz MCP server in the foreground.

  --stdio   Speak MCP on stdin/stdout, for a client that launches the server (default).
  --http    Serve Streamable HTTP at http://127.0.0.1:<PORT>/mcp (PORT defaults to 3767).
  --help    Show this help.

Settings come from the environment (SIGNOZ_BASE_URL, SIGNOZ_API_KEY or SIGNOZ_AUTH_TOKEN and
SIGNOZ_REFRESH_AUTH_TOKEN, SIGNOZ_ENV, PORT), then the configuration saved by \`signoz mcp config\`
(SIGNOZ_CONFIG points at another file), then the defaults.
`;

/** The transport the arguments ask for. `--help` wins over everything else. */
export function parseSignozMcpArgs(argv: readonly string[]): { mode: SignozMcpMode } {
  const known = new Set(["--stdio", "--http", "--help", "-h"]);
  for (const arg of argv) {
    if (!known.has(arg)) throw new TypeError(`Unknown argument '${arg}'.\n\n${USAGE}`);
  }
  if (argv.includes("--help") || argv.includes("-h")) return { mode: "help" };
  if (argv.includes("--stdio") && argv.includes("--http")) {
    throw new TypeError(`Choose either --stdio or --http, not both.\n\n${USAGE}`);
  }
  return { mode: argv.includes("--http") ? "http" : "stdio" };
}

async function main(): Promise<void> {
  const { mode } = parseSignozMcpArgs(process.argv.slice(2));
  if (mode === "help") {
    process.stdout.write(USAGE);
    return;
  }
  const configFile = configFilePath(process.env);
  const config = resolveMcpConfig({ env: process.env, file: readEnvFile(configFile) });
  const missing = missingSettings(config);
  if (missing)
    throw new TypeError(
      `${missing} Set them in the environment or save them with \`signoz mcp config\` (${configFile}).`
    );
  const connection = { ...config, sessionFile: sessionFilePath(configFile) };

  if (mode === "stdio") {
    const server = await serveSignozMcpStdio(connection);
    // stdout is the protocol channel: everything else goes to stderr.
    // oxlint-disable-next-line no-console
    console.error("SigNoz MCP server running on stdio");
    await server.closed;
    process.exit(0);
  }

  const server = await startSignozMcpServer(connection);
  // oxlint-disable-next-line no-console -- stderr is the only channel a CLI has
  console.error(`SigNoz MCP server listening on ${server.url}`);
  const stop = (): void => {
    void server.close().then(() => process.exit(0));
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    // oxlint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
