import { PassThrough, Readable, Writable } from "node:stream";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ReadBuffer, serializeMessage } from "@modelcontextprotocol/sdk/shared/stdio.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { RunningSignozMcpStdio, serveSignozMcpStdio } from "../../../src/mcp";
import { parseSignozMcpArgs } from "../../../src/mcp/cli";
import { FakeSignoz, envelope } from "../fake-server";

/** The client end of a stdio pipe: newline-delimited JSON-RPC over a pair of streams. */
class StreamClientTransport implements Transport {
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  private readonly buffer = new ReadBuffer();

  constructor(
    private readonly input: Readable,
    private readonly output: Writable
  ) {}

  async start(): Promise<void> {
    this.input.on("data", (chunk: Buffer) => {
      this.buffer.append(chunk);
      for (let message = this.buffer.readMessage(); message; message = this.buffer.readMessage()) {
        this.onmessage?.(message);
      }
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    this.output.write(serializeMessage(message));
  }

  async close(): Promise<void> {
    this.onclose?.();
  }
}

let running: RunningSignozMcpStdio | undefined;
let signoz: FakeSignoz;
beforeEach(async () => {
  signoz = await FakeSignoz.start((_req, seen) =>
    seen.path === "/api/v1/service_accounts/me" ? envelope({ id: "sa1", name: "ci" }) : envelope({})
  );
});
afterEach(async () => {
  await running?.close();
  running = undefined;
  await signoz.stop();
});

async function serve(environment?: string): Promise<{ client: Client; stdin: PassThrough }> {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  running = await serveSignozMcpStdio({ baseUrl: signoz.url, apiKey: "secret", environment, stdin, stdout });
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamClientTransport(stdout, stdin));
  return { client, stdin };
}

function text(result: Awaited<ReturnType<Client["callTool"]>>): string {
  return (result.content as { type: string; text: string }[]).map((part) => part.text).join("");
}

describe("serveSignozMcpStdio", () => {
  it("serves the tools over stdin/stdout and calls SigNoz with the given key", async () => {
    const { client } = await serve("production");
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining(["signoz_whoami", "signoz_search_logs", "signoz_create_dashboard", "signoz_call"])
    );
    expect(client.getInstructions()).toContain("The default environment is 'production'");

    const result = await client.callTool({ name: "signoz_whoami", arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toContain('"name": "ci"');
    expect(text(result)).toContain('"defaultEnvironment": "production"');
    expect(signoz.seen[0]?.apiKey).toBe("secret");
  });

  it("settles `closed` when the client closes stdin", async () => {
    const { stdin } = await serve();
    stdin.end();
    await expect(running?.closed).resolves.toBeUndefined();
  });

  it("rejects a missing credential or a bad base URL before touching the streams", async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    await expect(serveSignozMcpStdio({ baseUrl: signoz.url, apiKey: " ", stdin, stdout })).rejects.toThrow(
      "A credential is required"
    );
    await expect(serveSignozMcpStdio({ baseUrl: signoz.url, authToken: "a", stdin, stdout })).rejects.toThrow(
      "A credential is required"
    );
    await expect(serveSignozMcpStdio({ baseUrl: "nope", apiKey: "k", stdin, stdout })).rejects.toThrow(
      "baseUrl is not a valid URL"
    );
    expect(stdin.listenerCount("data")).toBe(0);
  });
});

describe("parseSignozMcpArgs", () => {
  it("defaults to stdio and takes --http, --stdio and --help", () => {
    expect(parseSignozMcpArgs([])).toEqual({ mode: "stdio" });
    expect(parseSignozMcpArgs(["--stdio"])).toEqual({ mode: "stdio" });
    expect(parseSignozMcpArgs(["--http"])).toEqual({ mode: "http" });
    expect(parseSignozMcpArgs(["-h"])).toEqual({ mode: "help" });
    expect(parseSignozMcpArgs(["--http", "--help"])).toEqual({ mode: "help" });
  });

  it("refuses an unknown argument and both transports at once", () => {
    expect(() => parseSignozMcpArgs(["--port"])).toThrow("Unknown argument '--port'");
    expect(() => parseSignozMcpArgs(["--http", "--stdio"])).toThrow("either --stdio or --http");
  });
});
