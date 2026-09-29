import { timingSafeEqual } from "node:crypto";
import { IncomingMessage, Server, ServerResponse, createServer } from "node:http";
import { AddressInfo } from "node:net";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SERVER_VERSION, buildSignozMcpServer } from "./build";
import { type SignozConnection, clientFor } from "./config";

export interface SignozMcpServerOptions extends SignozConnection {
  /** Port to listen on, on 127.0.0.1. `0` picks a free one; read it back from `url`. */
  port: number;
  /** The default `deployment.environment` the telemetry tools filter on. */
  environment?: string;
  /**
   * Enables `POST /shutdown`: a request carrying this value in `X-Signoz-Shutdown` closes the
   * server (202); any other value gets 403. `signoz mcp stop` uses it, because on Windows a
   * signal is `TerminateProcess` and no cleanup would run.
   */
  shutdownToken?: string;
  /** Called after `/shutdown` has closed the server — the process exits there. */
  onShutdown?: () => void;
}

export interface RunningSignozMcpServer {
  /** The MCP endpoint, e.g. `http://127.0.0.1:3767/mcp`. */
  url: string;
  port: number;
  /** Stop accepting connections and close the listener. */
  close(): Promise<void>;
}

const MCP_PATH = "/mcp";
const HEALTH_PATH = "/health";
const SHUTDOWN_PATH = "/shutdown";
export const SHUTDOWN_HEADER = "x-signoz-shutdown";
/** Host names a request may name: the listener is loopback-only, and DNS rebinding would name another. */
const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const MAX_BODY_BYTES = 4 * 1024 * 1024;

/** The SigNoz URL and credential every transport needs. */
export function validateConnection(options: SignozConnection): void {
  const { baseUrl } = options ?? ({} as SignozConnection);
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new TypeError("baseUrl is required, e.g. 'https://signoz.example.com'.");
  }
  try {
    new URL(baseUrl);
  } catch {
    throw new TypeError(`baseUrl is not a valid URL: '${baseUrl}'.`);
  }
  const hasKey = typeof options.apiKey === "string" && options.apiKey.trim() !== "";
  const hasSession = !!options.authToken?.trim() && !!options.refreshAuthToken?.trim();
  if (!hasKey && !hasSession) {
    throw new TypeError("A credential is required: apiKey, or authToken and refreshAuthToken.");
  }
}

function validate(options: SignozMcpServerOptions): void {
  const { port } = options ?? ({} as SignozMcpServerOptions);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError(`port must be an integer from 0 to 65535 (received ${String(port)}).`);
  }
  validateConnection(options);
}

/** Whether a `Host` header names this loopback listener (any port). */
export function hostAllowed(host: string | undefined): boolean {
  if (!host) return false;
  const name = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  return ALLOWED_HOSTS.has(name.toLowerCase());
}

function sameToken(given: string | string[] | undefined, expected: string): boolean {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

function rpcError(res: ServerResponse, status: number, code: number, message: string): void {
  sendJson(res, status, { jsonrpc: "2.0", error: { code, message }, id: null });
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new RangeError("Request body too large.");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/**
 * Build the SigNoz MCP server and serve it over Streamable HTTP at `http://127.0.0.1:<port>/mcp`.
 *
 * Stateless: every POST gets a fresh server and transport, so there is no session to leak or
 * expire; the SDK client (and its session rotation) is shared across them. Requests whose `Host`
 * is not loopback are refused (DNS rebinding), `GET /health` answers `{ ok, baseUrl, auth, version }`
 * and, with a `shutdownToken`, `POST /shutdown` stops it. Resolves once the port is bound; rejects
 * if it cannot be (e.g. in use).
 *
 * ```ts
 * import { startSignozMcpServer } from "@hoyasumii/signoz/mcp";
 * const mcp = await startSignozMcpServer({ port: 3767, baseUrl: "https://signoz.example.com", apiKey: "…" });
 * // claude mcp add --transport http signoz http://127.0.0.1:3767/mcp
 * ```
 */
export async function startSignozMcpServer(options: SignozMcpServerOptions): Promise<RunningSignozMcpServer> {
  validate(options);
  // One per process: every POST shares it, so a session rotates once for all of them.
  const client = clientFor(options);
  const environment = options.environment || undefined;
  const close = (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      // `listener` is assigned below, before anything can call this.
      if (!listener.listening) return resolve();
      listener.closeAllConnections();
      listener.close((error) => (error ? reject(error) : resolve()));
    });

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (!hostAllowed(req.headers.host)) {
      sendJson(res, 403, { error: "Forbidden host. The MCP server only answers requests to 127.0.0.1 or localhost." });
      return;
    }
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    if (pathname === HEALTH_PATH && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        baseUrl: client.baseUrl,
        auth: client.auth,
        environment: environment ?? null,
        version: SERVER_VERSION,
      });
      return;
    }
    if (pathname === SHUTDOWN_PATH && req.method === "POST") {
      // Without a token the route exists but nothing opens it.
      if (!options.shutdownToken || !sameToken(req.headers[SHUTDOWN_HEADER], options.shutdownToken)) {
        sendJson(res, 403, { error: "Wrong or missing shutdown token." });
        return;
      }
      res.on("finish", () => {
        void close().then(() => options.onShutdown?.());
      });
      sendJson(res, 202, { ok: true, stopping: true });
      return;
    }
    if (pathname !== MCP_PATH) {
      sendJson(res, 404, { error: `Not found. The MCP endpoint is ${MCP_PATH}.` });
      return;
    }
    if (req.method !== "POST") {
      // Stateless mode has no server-initiated stream (GET) and no session to end (DELETE).
      res.setHeader("Allow", "POST");
      rpcError(res, 405, -32000, "Method not allowed.");
      return;
    }

    let body: unknown;
    try {
      body = await readJson(req);
    } catch (error) {
      rpcError(res, 400, -32700, `Parse error: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    const server = buildSignozMcpServer(client, { environment });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (error) {
      if (!res.headersSent) {
        rpcError(res, 500, -32603, `Internal error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  const listener: Server = createServer((req, res) => {
    void handle(req, res);
  });
  await new Promise<void>((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(options.port, "127.0.0.1", () => {
      listener.off("error", reject);
      resolve();
    });
  });

  const { port } = listener.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}${MCP_PATH}`, port, close };
}
