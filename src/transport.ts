import type { RotatedTokens, Session, SessionTokens } from "./auth/session";
import {
  apiErrorFromBody,
  SignozApiError,
  SignozConfigError,
  SignozSessionExpiredError,
  SignozTimeoutError,
} from "./errors";

/**
 * How a successful response is read (classified by the generator from the spec):
 * - `envelope`: `{status, data}` → returns `data`;
 * - `empty`: 204 or a 2xx with no declared body → `undefined`;
 * - `raw`: a streamed file (CSV/NDJSON) → `Response`;
 * - `prometheus`: `{status, data, warnings, infos}` → the whole object;
 * - `redirect`: SSO callbacks (303) → `Response`, without following the redirect.
 */
export type ResponseMode = "envelope" | "empty" | "raw" | "prometheus" | "redirect";

export interface OperationSpec {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  mode: ResponseMode;
  /**
   * The operation declares `tokenizer`/`api_key` in `security`: a 401 triggers a rotate.
   * The Bearer goes on every call (no `security` does not mean public: e.g. `AuthzCheck`).
   */
  auth: boolean;
  body?: "json" | "form";
  /** Session operations handled by the session manager (they never trigger a rotate). */
  session?: "rotate" | "delete" | "login";
}

type PathParams = Record<string, string | number | boolean>;
export type QueryParams = Record<string, unknown>;

interface CallArgs {
  path?: PathParams;
  query?: QueryParams;
  body?: unknown;
}

export interface RequestOptions {
  /** Returns the `Response` unparsed (a non-2xx still throws). */
  raw?: boolean;
  /** Overrides the client's `timeoutMs` for this call (`0` or `Infinity` = no timeout). */
  timeoutMs?: number;
  /** Cancels the call. */
  signal?: AbortSignal;
  /** Extra headers (`Authorization` always comes from the SDK). */
  headers?: Record<string, string>;
}

interface TransportOptions {
  baseUrl: string;
  /** Browser session (Bearer + rotate). Mutually exclusive with `apiKey`. */
  session?: Session;
  /** Service account API key, sent in `SigNoz-Api-Key` (no rotate). Mutually exclusive with `session`. */
  apiKey?: string;
  fetch: typeof fetch;
  timeoutMs: number;
}

const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Validates `timeoutMs`: a positive integer up to ~24.8 days; `0` or `Infinity` turn the timeout off
 * (returns `undefined`). Any other value throws `SignozConfigError`.
 */
function normalizeTimeout(timeoutMs: number): number | undefined {
  if (timeoutMs === 0 || timeoutMs === Number.POSITIVE_INFINITY) return undefined;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new SignozConfigError(
      `invalid timeoutMs: ${timeoutMs} (use a number between 1 and ${MAX_TIMEOUT_MS}, or 0/Infinity to turn it off)`
    );
  }
  return timeoutMs;
}

/** Drops the trailing slash; keeps the base path (`https://host/signoz`). */
function normalizeBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

function buildPath(template: string, params: PathParams | undefined): string {
  return template.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = params?.[name];
    if (value === undefined || value === null || value === "") {
      throw new TypeError(`missing required path parameter: ${name}`);
    }
    return encodeURIComponent(String(value));
  });
}

function buildQuery(query: QueryParams | undefined): string {
  if (!query) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else if (typeof value === "object") {
      search.append(key, JSON.stringify(value));
    } else {
      search.append(key, String(value));
    }
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

interface PreparedBody {
  body: NonNullable<RequestInit["body"]> | undefined;
  contentType?: string;
  /** A streamed body cannot be resent after a rotate. */
  replayable: boolean;
}

function prepareBody(body: unknown, kind: "json" | "form" | undefined): PreparedBody {
  if (body === undefined) return { body: undefined, replayable: true };
  if (kind === "form") {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      if (v !== undefined && v !== null) form.append(k, String(v));
    }
    return {
      body: form.toString(),
      contentType: "application/x-www-form-urlencoded",
      replayable: true,
    };
  }
  if (body instanceof ReadableStream) return { body, replayable: false };
  if (typeof body === "string" || body instanceof ArrayBuffer || body instanceof Uint8Array || body instanceof Blob) {
    return { body: body as NonNullable<RequestInit["body"]>, replayable: true };
  }
  if (body instanceof URLSearchParams || body instanceof FormData) return { body, replayable: true };
  return {
    body: JSON.stringify(body),
    contentType: "application/json",
    replayable: true,
  };
}

/** The API key header (the spec's `securitySchemes.api_key`). */
export const API_KEY_HEADER = "SigNoz-Api-Key";

/**
 * Sends the requests: Bearer (or API key), a timeout per attempt, rotate on 401 and reading by response
 * mode.
 */
export class Transport {
  readonly baseUrl: string;
  readonly session: Session | undefined;
  readonly #apiKey: string | undefined;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number | undefined;

  constructor(options: TransportOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    if (!options.session === !options.apiKey) {
      throw new SignozConfigError("pass the session (authToken/refreshAuthToken) or the apiKey, not both");
    }
    this.session = options.session;
    this.#apiKey = options.apiKey;
    this.#fetch = options.fetch;
    this.#timeoutMs = normalizeTimeout(options.timeoutMs);
  }

  /** Runs an operation from the spec. */
  async call(op: OperationSpec, args: CallArgs | undefined, options: RequestOptions = {}): Promise<unknown> {
    if (op.session === "rotate") {
      if (!this.session) throw new SignozConfigError("rotateSession() requires session authentication, not an API key");
      return this.session.rotateNow();
    }

    const path = buildPath(op.path, args?.path) + buildQuery(args?.query);
    const result = await this.#send({
      method: op.method,
      path,
      body: args?.body,
      bodyKind: op.body,
      canRotate: this.session !== undefined && op.auth && op.session === undefined,
      mode: options.raw ? "raw" : op.mode,
      manualRedirect: op.mode === "redirect",
      operationId: op.id,
      options,
    });
    if (op.session === "delete") this.session?.markLoggedOut();
    return result;
  }

  /**
   * Free-form call for routes outside the spec (e.g. legacy endpoints the frontend uses).
   * Always authenticates. `auto` mode: 204 → `undefined`; `{status, data}` → `data`; other JSON → the JSON;
   * any other content → text.
   */
  async request<T = unknown>(
    method: string,
    path: string,
    init: { query?: QueryParams; body?: unknown } & RequestOptions = {}
  ): Promise<T> {
    const fullPath = (path.startsWith("/") ? path : `/${path}`) + buildQuery(init.query);
    return (await this.#send({
      method: method.toUpperCase(),
      path: fullPath,
      body: init.body,
      bodyKind: undefined,
      canRotate: this.session !== undefined,
      mode: init.raw ? "raw" : "auto",
      options: init,
    })) as T;
  }

  /** `POST /api/v2/sessions/rotate` with the given pair, bypassing the automatic rotate. */
  readonly rotateCall = async (tokens: SessionTokens): Promise<RotatedTokens> => {
    const path = "/api/v2/sessions/rotate";
    const res = await this.#fetchWithTimeout(
      "POST",
      path,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.authToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refreshToken: tokens.refreshAuthToken }),
      },
      this.#timeoutMs,
      undefined,
      true
    );
    const secrets = [tokens.authToken, tokens.refreshAuthToken];
    const parsed = await readBody(res);
    if (!res.ok) {
      throw apiErrorFromBody(
        {
          status: res.status,
          method: "POST",
          path,
          operationId: "RotateSession",
        },
        parsed,
        secrets
      );
    }
    const data = (parsed as { data?: Record<string, unknown> } | undefined)?.data;
    if (!data || typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
      throw new SignozApiError({
        status: res.status,
        method: "POST",
        path,
        operationId: "RotateSession",
        message: "rotate response without accessToken/refreshToken",
      });
    }
    return {
      authToken: data.accessToken,
      refreshAuthToken: data.refreshToken,
      expiresIn: typeof data.expiresIn === "number" ? data.expiresIn : undefined,
    };
  };

  async #send(req: {
    method: string;
    path: string;
    body: unknown;
    bodyKind: "json" | "form" | undefined;
    canRotate: boolean;
    mode: ResponseMode | "auto";
    /** SSO callbacks: returns the 3xx without following it, even with `{ raw: true }`. */
    manualRedirect?: boolean;
    operationId?: string;
    options: RequestOptions;
  }): Promise<unknown> {
    const { method, path, mode, options } = req;
    const cleanPath = path.split("?")[0] ?? path;
    const prepared = prepareBody(req.body, req.bodyKind);
    const timeoutMs = options.timeoutMs === undefined ? this.#timeoutMs : normalizeTimeout(options.timeoutMs);

    const session = this.session;
    const attempt = async (): Promise<{ res: Response; usedToken: string }> => {
      if (req.canRotate && session?.loggedOut) {
        throw new SignozSessionExpiredError({
          status: 401,
          method,
          path: cleanPath,
          operationId: req.operationId,
          message: "session ended by deleteSession()",
        });
      }
      const usedToken = session?.accessToken ?? "";
      const headers = new Headers({ Accept: "application/json" });
      for (const [k, v] of Object.entries(options.headers ?? {})) headers.set(k, v);
      if (prepared.contentType) headers.set("Content-Type", prepared.contentType);
      headers.delete("Authorization");
      headers.delete(API_KEY_HEADER);
      if (this.#apiKey) headers.set(API_KEY_HEADER, this.#apiKey);
      else if (session && !session.loggedOut) headers.set("Authorization", `Bearer ${usedToken}`);
      const res = await this.#fetchWithTimeout(
        method,
        cleanPath,
        {
          method,
          headers,
          body: prepared.body,
          redirect: req.manualRedirect ? "manual" : "follow",
        },
        timeoutMs,
        options.signal,
        mode !== "raw" && mode !== "redirect",
        path
      );
      return { res, usedToken };
    };

    const first = await attempt();
    let { res } = first;
    const { usedToken } = first;
    if (res.status === 401 && req.canRotate && session) {
      await session.refreshAfterUnauthorized(usedToken);
      if (prepared.replayable) {
        await res.body?.cancel();
        ({ res } = await attempt());
      }
    }

    const base = {
      status: res.status,
      method,
      path: cleanPath,
      operationId: req.operationId,
    };
    const isRedirect = req.manualRedirect === true && res.status >= 300 && res.status < 400;
    if (!res.ok && !isRedirect) {
      throw apiErrorFromBody(base, await readBody(res), this.#secrets);
    }

    switch (mode) {
      case "raw":
      case "redirect":
        return res;
      case "empty":
        await res.text();
        return undefined;
      case "envelope": {
        const parsed = await readBody(res);
        return parsed && typeof parsed === "object" ? (parsed as { data?: unknown }).data : undefined;
      }
      case "prometheus": {
        const parsed = await readBody(res);
        if (parsed && typeof parsed === "object" && (parsed as { status?: unknown }).status === "error") {
          throw apiErrorFromBody(base, parsed, this.#secrets);
        }
        return parsed;
      }
      case "auto": {
        if (res.status === 204) return undefined;
        const parsed = await readBody(res);
        if (parsed && typeof parsed === "object" && "status" in parsed && "data" in parsed) {
          return (parsed as { data: unknown }).data;
        }
        return parsed;
      }
    }
  }

  /** Values that never leave in an error: the session pair or the API key. */
  get #secrets(): readonly string[] {
    return this.session ? this.session.secrets : this.#apiKey ? [this.#apiKey] : [];
  }

  /**
   * `fetch` with its own timeout per attempt. With `coverBody = false` (stream), the deadline only lasts until
   * the headers arrive; with `true`, the timer runs until `readBody` has read the body.
   */
  async #fetchWithTimeout(
    method: string,
    path: string,
    init: RequestInit,
    timeoutMs: number | undefined,
    external: AbortSignal | undefined,
    coverBody: boolean,
    pathWithQuery: string = path
  ): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timer =
      timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs);
    const onAbort = () => controller.abort(external?.reason);
    external?.addEventListener("abort", onAbort, { once: true });
    if (external?.aborted) controller.abort(external.reason);
    const done = () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onAbort);
    };
    try {
      const res = await this.#fetch(this.baseUrl + pathWithQuery, {
        ...init,
        signal: controller.signal,
      });
      if (!coverBody) {
        done();
        return res;
      }
      // Reads the body within the deadline and returns an equivalent Response already in memory.
      const buffer = await res.arrayBuffer();
      done();
      return new Response(res.status === 204 || res.status === 304 ? null : buffer, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    } catch (err) {
      done();
      if (timedOut && timeoutMs !== undefined) throw new SignozTimeoutError(method, path, timeoutMs);
      throw err;
    }
  }
}

/** Reads the body: JSON if it is valid JSON, otherwise text (or `undefined` if empty). */
async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
