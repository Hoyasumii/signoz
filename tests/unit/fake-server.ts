import { readFileSync } from "node:fs";
import { IncomingMessage, Server, createServer } from "node:http";
import { AddressInfo } from "node:net";
import { join } from "node:path";

export interface Seen {
  method: string;
  path: string;
  search: string;
  authorization: string | null;
  apiKey: string | null;
  contentType: string | null;
  body: string;
}

export type Handler = (req: Request, seen: Seen) => Response | Promise<Response>;

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** A local HTTP server (`node:http`) that records the requests and answers with `handler`. */
export class FakeSignoz {
  readonly seen: Seen[] = [];
  handler: Handler;
  #server: Server;

  private constructor(handler: Handler) {
    this.handler = handler;
    this.#server = createServer((req, res) => {
      void (async () => {
        const url = new URL(req.url ?? "/", "http://127.0.0.1");
        const body = await readBody(req);
        const header = (name: string): string | null => {
          const value = req.headers[name];
          return value === undefined ? null : Array.isArray(value) ? value.join(", ") : value;
        };
        const seen: Seen = {
          method: req.method ?? "GET",
          path: url.pathname,
          search: url.search,
          authorization: header("authorization"),
          apiKey: header("signoz-api-key"),
          contentType: header("content-type"),
          body,
        };
        this.seen.push(seen);
        const request = new Request(new URL(req.url ?? "/", this.url), {
          method: seen.method,
          headers: req.headers as Record<string, string>,
          body: seen.method === "GET" || seen.method === "HEAD" ? undefined : body,
        });
        const response = await this.handler(request, seen);
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => (headers[key] = value));
        res.writeHead(response.status, headers);
        res.end(Buffer.from(await response.arrayBuffer()));
      })().catch((error: unknown) => {
        res.writeHead(500).end(String(error));
      });
    });
  }

  /** Starts the server on a free port of 127.0.0.1. */
  static async start(handler: Handler): Promise<FakeSignoz> {
    const fake = new FakeSignoz(handler);
    await new Promise<void>((resolve) => fake.#server.listen(0, "127.0.0.1", resolve));
    return fake;
  }

  get url(): string {
    return `http://127.0.0.1:${(this.#server.address() as AddressInfo).port}`;
  }

  count(path: string): number {
    return this.seen.filter((s) => s.path === path).length;
  }

  stop(): Promise<void> {
    this.#server.closeAllConnections();
    return new Promise((resolve) => this.#server.close(() => resolve()));
  }
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
export const envelope = (data: unknown, status = 200) => json({ status: "success", data }, status);
export const renderError = (status: number, code: string, message: string, type = "unauthenticated") =>
  json({ status: "error", error: { type, code, message } }, status);

export const ROTATE = "/api/v2/sessions/rotate";

/** A rotate handler that accepts the `[access, refresh]` pair and returns the next one in the sequence. */
export function rotator(pairs: [string, string][]) {
  let i = 0;
  return async (seen: Seen): Promise<Response> => {
    const current = pairs[i];
    const next = pairs[i + 1];
    const { refreshToken } = JSON.parse(seen.body || "{}") as { refreshToken?: string };
    if (!current || !next || seen.authorization !== `Bearer ${current[0]}` || refreshToken !== current[1]) {
      return renderError(401, "unauthenticated", "invalid token pair");
    }
    i++;
    return envelope({ tokenType: "bearer", accessToken: next[0], refreshToken: next[1], expiresIn: 1800 });
  };
}

/** The mirrored version's spec, read from disk. */
export function readSpecText(): string {
  return readFileSync(join(__dirname, "../../spec/openapi.v0.142.1.yml"), "utf8");
}
