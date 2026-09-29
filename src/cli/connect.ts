import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createSignozClient } from "../client";
import { SERVER_VERSION, buildSignozMcpServer } from "../mcp/build";
import { clientFor } from "../mcp/config";

export interface ConnectOptions {
  /** A running `signoz-mcp` endpoint, e.g. `http://127.0.0.1:3767/mcp`. Without it the server runs in-process. */
  url?: string;
  /** The SigNoz instance for the in-process server. */
  baseUrl?: string;
  /** The API key for the in-process server. */
  apiKey?: string;
  /** The browser session pair for the in-process server, when there is no API key. */
  authToken?: string;
  refreshAuthToken?: string;
  /** Where the in-process server persists rotated session tokens. */
  sessionFile?: string;
  /** Default `deployment.environment` for the in-process server. */
  environment?: string;
}

export interface SignozMcpConnection {
  client: Client;
  /**
   * Why a tool call cannot succeed yet, when that is known before calling — an in-process server
   * with no URL or credential. Listing tools still works, so `--help` needs no credentials.
   */
  missing?: string;
  close(): Promise<void>;
}

const PLACEHOLDER_URL = "http://127.0.0.1:9";

/**
 * An MCP client connected to the SigNoz MCP server: over Streamable HTTP when `url` is given,
 * otherwise to {@link buildSignozMcpServer} in this process through an in-memory pair.
 */
export async function connectSignozMcp(options: ConnectOptions): Promise<SignozMcpConnection> {
  const client = new Client({ name: "signoz-cli", version: SERVER_VERSION });

  if (options.url) {
    let url: URL;
    try {
      url = new URL(options.url);
    } catch {
      throw new TypeError(`--url is not a valid URL: '${options.url}'.`);
    }
    await client.connect(new StreamableHTTPClientTransport(url));
    return { client, close: () => client.close() };
  }

  const baseUrl = options.baseUrl?.trim() ?? "";
  if (baseUrl) {
    try {
      new URL(baseUrl);
    } catch {
      throw new TypeError(`--base-url is not a valid URL: '${baseUrl}'.`);
    }
  }
  const apiKey = options.apiKey?.trim() ?? "";
  const hasSession = !!options.authToken?.trim() && !!options.refreshAuthToken?.trim();
  const missing =
    !baseUrl || (!apiKey && !hasSession)
      ? "No SigNoz URL or credential: save them with `signoz mcp config`, pass --base-url and --api-key, " +
        "or --url to use a running signoz-mcp."
      : undefined;
  // The SDK refuses to exist without a credential; this placeholder never leaves the process,
  // because `missing` stops every tool call before it is made.
  const signoz = missing
    ? createSignozClient({ baseUrl: baseUrl || PLACEHOLDER_URL, apiKey: "missing" })
    : clientFor({
        baseUrl,
        apiKey: apiKey || undefined,
        authToken: options.authToken,
        refreshAuthToken: options.refreshAuthToken,
        sessionFile: options.sessionFile,
      });
  const server = buildSignozMcpServer(signoz, { environment: options.environment || undefined });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  await client.connect(clientSide);
  return {
    client,
    missing,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
