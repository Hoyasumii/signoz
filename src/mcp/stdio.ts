import { Readable, Writable } from "node:stream";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildSignozMcpServer } from "./build";
import { type SignozConnection, clientFor } from "./config";
import { validateConnection } from "./server";

export interface SignozMcpStdioOptions extends SignozConnection {
  /** The default `deployment.environment` the telemetry tools filter on. */
  environment?: string;
  /** Where requests arrive. Default: `process.stdin`. */
  stdin?: Readable;
  /** Where responses go. Default: `process.stdout` — so nothing else may write to it. */
  stdout?: Writable;
}

export interface RunningSignozMcpStdio {
  /** Settles once the connection is over: the client closed stdin, or {@link close} was called. */
  closed: Promise<void>;
  /** Stop reading stdin and close the server. */
  close(): Promise<void>;
}

/**
 * Serve the SigNoz MCP server over stdio: newline-delimited JSON-RPC on stdin/stdout, the way an
 * MCP client runs a server it launched itself.
 *
 * stdout carries the protocol; log to stderr only. Resolves once connected; `closed` settles when
 * the client closes stdin.
 *
 * ```ts
 * import { serveSignozMcpStdio } from "@hoyasumii/signoz/mcp";
 * const mcp = await serveSignozMcpStdio({ baseUrl: "https://signoz.example.com", apiKey: "…" });
 * await mcp.closed;
 * ```
 */
export async function serveSignozMcpStdio(options: SignozMcpStdioOptions): Promise<RunningSignozMcpStdio> {
  validateConnection(options);
  const server = buildSignozMcpServer(clientFor(options), { environment: options.environment });
  const stdin = options.stdin ?? process.stdin;
  const transport = new StdioServerTransport(stdin, options.stdout ?? process.stdout);

  let settle: () => void = () => undefined;
  const closed = new Promise<void>((resolve) => {
    settle = resolve;
  });
  const onEnd = (): void => {
    void server.close();
  };
  server.server.onclose = () => {
    stdin.off("end", onEnd);
    settle();
  };
  stdin.once("end", onEnd);
  await server.connect(transport);

  return {
    closed,
    close: async () => {
      await server.close();
      await closed;
    },
  };
}
