/** Keys whose value never leaves the SDK in an error, a log or an exposed `body`. */
const SECRET_KEYS = new Set([
  "accesstoken",
  "refreshtoken",
  "authtoken",
  "refreshauthtoken",
  "authorization",
  "token",
  "apikey",
  "signoz-api-key",
]);
const MASK = "***";

/**
 * Minimum length of a secret for its literal occurrences to be masked: a short value (e.g. `k` in a
 * test) would erase bits of any message. Real tokens and API keys are much longer.
 */
const MIN_LITERAL_SECRET = 8;

/**
 * Copies `value`, replacing with `***` the values of sensitive keys and any literal occurrence of
 * the known tokens (`secrets`), inside strings too.
 */
export function redact(value: unknown, secrets: readonly string[] = []): unknown {
  const known = secrets.filter((s) => s.length >= MIN_LITERAL_SECRET);
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      let out = v;
      for (const s of known) out = out.split(s).join(MASK);
      return out;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, inner] of Object.entries(v)) {
        out[k] = SECRET_KEYS.has(k.toLowerCase()) && inner != null ? MASK : walk(inner);
      }
      return out;
    }
    return v;
  };
  return walk(value);
}

interface SignozApiErrorInit {
  status: number;
  method: string;
  path: string;
  operationId?: string;
  code?: string;
  type?: string;
  message: string;
  body?: unknown;
}

/** An API error response (the `RenderErrorResponse` shape or, on Prometheus routes, `errorType`/`error`). */
export class SignozApiError extends Error {
  override readonly name: string = "SignozApiError";
  readonly status: number;
  readonly method: string;
  /** The path without the query string (the query may carry filters, never tokens, but is left out to be safe). */
  readonly path: string;
  readonly operationId?: string;
  /** SigNoz's `error.code` or Prometheus's `errorType`. */
  readonly code?: string;
  /** SigNoz's `error.type` (e.g. `unauthenticated`, `not-found`). */
  readonly type?: string;
  /** The response body, with the tokens already masked. */
  readonly body?: unknown;

  constructor(init: SignozApiErrorInit) {
    super(`${init.method} ${init.path} → ${init.status}: ${init.message}`);
    this.status = init.status;
    this.method = init.method;
    this.path = init.path;
    this.operationId = init.operationId;
    this.code = init.code;
    this.type = init.type;
    this.body = init.body;
  }
}

/** The session rotate was refused (401): fresh tokens must be copied from the browser. */
export class SignozSessionExpiredError extends SignozApiError {
  override readonly name = "SignozSessionExpiredError";
}

/** Invalid configuration (missing token, malformed URL). */
export class SignozConfigError extends Error {
  override readonly name = "SignozConfigError";
}

/** The request exceeded `timeoutMs`. */
export class SignozTimeoutError extends Error {
  override readonly name = "SignozTimeoutError";
  constructor(
    readonly method: string,
    readonly path: string,
    readonly timeoutMs: number
  ) {
    super(`${method} ${path}: no response within ${timeoutMs}ms`);
  }
}

/**
 * Builds the error from the body of a non-2xx response.
 * Accepts `{status, error: {code, message, type}}` (SigNoz) and `{status:"error", errorType, error}` (Prometheus).
 */
export function apiErrorFromBody(
  base: { status: number; method: string; path: string; operationId?: string },
  body: unknown,
  secrets: readonly string[],
  Kind: typeof SignozApiError = SignozApiError
): SignozApiError {
  let code: string | undefined;
  let type: string | undefined;
  let message: string | undefined;
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    const err = b.error;
    if (err && typeof err === "object") {
      const e = err as Record<string, unknown>;
      if (typeof e.code === "string") code = e.code;
      if (typeof e.type === "string") type = e.type;
      if (typeof e.message === "string") message = e.message;
    } else if (typeof err === "string") {
      message = err;
      if (typeof b.errorType === "string") code = b.errorType;
    }
  } else if (typeof body === "string" && body.trim()) {
    message = body.trim().slice(0, 500);
  }
  const safeMessage = redact(message ?? `HTTP ${base.status}`, secrets) as string;
  return new Kind({
    ...base,
    code,
    type,
    message: safeMessage,
    body: redact(body, secrets),
  });
}
