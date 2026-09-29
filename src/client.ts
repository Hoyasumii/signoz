import { FileTokenStore, resolveInitialTokens, type TokenStore, tokenPairHash } from "./auth/file-token-store";
import { type OnTokensRotated, Session, type SessionTokens } from "./auth/session";
import { SignozConfigError } from "./errors";
import { createServices, type SignozServices } from "./generated/services/index";
import { type QueryParams, type RequestOptions, Transport } from "./transport";

interface CommonOptions {
  /** The instance URL, with its base path if any (e.g. `https://example.com/signoz`). */
  baseUrl: string;
  /** Timeout per attempt, in ms (default 30000; `0` or `Infinity` turn it off). */
  timeoutMs?: number;
  /** An alternative `fetch` (tests, proxy). */
  fetch?: typeof fetch;
}

/** Authentication through the browser session: Bearer, with an automatic rotate on 401. */
export interface SignozSessionOptions extends CommonOptions {
  /** The value of SigNoz's `AUTH_TOKEN` localStorage key. */
  authToken: string;
  /** The value of SigNoz's `REFRESH_AUTH_TOKEN` localStorage key. */
  refreshAuthToken: string;
  /** Called on every rotate with the new pair (to persist it yourself). */
  onTokensRotated?: OnTokensRotated;
  /** Persists the rotated pair (e.g. `new FileTokenStore()`). */
  tokenStore?: TokenStore;
  apiKey?: never;
}

/** Authentication by service account API key (`SigNoz-Api-Key`), with no session and no rotate. */
export interface SignozApiKeyOptions extends CommonOptions {
  /** A service account's API key (Settings → Service Accounts in SigNoz). */
  apiKey: string;
  authToken?: never;
  refreshAuthToken?: never;
}

export type SignozClientOptions = SignozSessionOptions | SignozApiKeyOptions;

export type SignozClient = SignozServices & {
  /** The instance's normalized URL. */
  readonly baseUrl: string;
  /** How the client authenticates. */
  readonly auth: "api_key" | "session";
  /** The current token pair (changes on every rotate); `undefined` with an API key. */
  readonly tokens: SessionTokens | undefined;
  /** A route outside the spec: always authenticates (and, with a session, rotates on 401). */
  request<T = unknown>(
    method: string,
    path: string,
    init?: { query?: QueryParams; body?: unknown } & RequestOptions
  ): Promise<T>;
};

function requireString(value: unknown, name: string, hint: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new SignozConfigError(`${name} is required (${hint})`);
  }
  return value.trim();
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Creates the client, authenticated by a service account API key **or** by the browser session's tokens.
 *
 * ```ts
 * const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
 * // or
 * const signoz = createSignozClient({
 *   baseUrl: "https://signoz.example.com",
 *   authToken: localStorage.AUTH_TOKEN,
 *   refreshAuthToken: localStorage.REFRESH_AUTH_TOKEN,
 * });
 * const me = await signoz.users.getMyUser();
 * ```
 */
export function createSignozClient(options: SignozClientOptions): SignozClient {
  const baseUrl = requireString(options?.baseUrl, "baseUrl", "the SigNoz instance URL");
  assertUrl(baseUrl);
  if (hasText(options.apiKey)) {
    if (hasText(options.authToken) || hasText(options.refreshAuthToken)) {
      throw new SignozConfigError("pass apiKey or the authToken/refreshAuthToken pair, not both");
    }
    return buildApiKeyClient({
      baseUrl,
      apiKey: options.apiKey.trim(),
      timeoutMs: options.timeoutMs,
      fetch: options.fetch,
    });
  }
  const session = options as SignozSessionOptions;
  const given: SessionTokens = {
    authToken: requireString(session.authToken, "authToken", "the AUTH_TOKEN localStorage key, or use apiKey"),
    refreshAuthToken: requireString(
      session.refreshAuthToken,
      "refreshAuthToken",
      "the REFRESH_AUTH_TOKEN localStorage key"
    ),
  };
  return buildSessionClient({ ...session, baseUrl }, given, tokenPairHash(given));
}

function assertUrl(baseUrl: string): void {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    throw new SignozConfigError(`invalid baseUrl: ${baseUrl}`);
  }
}

function finish(t: Transport, auth: SignozClient["auth"], tokens: () => SessionTokens | undefined): SignozClient {
  const client = createServices(t) as SignozClient;
  Object.defineProperties(client, {
    baseUrl: { value: t.baseUrl, enumerable: true },
    auth: { value: auth, enumerable: false },
    tokens: { get: tokens, enumerable: false },
    request: { value: t.request.bind(t), enumerable: false },
  });
  return client;
}

function buildApiKeyClient(options: SignozApiKeyOptions): SignozClient {
  const transport = new Transport({
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    fetch: options.fetch ?? fetch,
    timeoutMs: options.timeoutMs ?? 30_000,
  });
  return finish(transport, "api_key", () => undefined);
}

function buildSessionClient(options: SignozSessionOptions, tokens: SessionTokens, tokenSource: string): SignozClient {
  // The rotate is only called once the transport exists: the closure reads the already initialized const.
  const session: Session = new Session({
    tokens,
    rotateCall: (t) => transport.rotateCall(t),
    onTokensRotated: options.onTokensRotated,
    tokenStore: options.tokenStore,
    tokenSource,
  });
  const transport: Transport = new Transport({
    baseUrl: options.baseUrl,
    session,
    fetch: options.fetch ?? fetch,
    timeoutMs: options.timeoutMs ?? 30_000,
  });
  return finish(transport, "session", () => session.tokens);
}

export interface FromEnvOptions {
  baseUrl?: string;
  apiKey?: string;
  authToken?: string;
  refreshAuthToken?: string;
  onTokensRotated?: OnTokensRotated;
  timeoutMs?: number;
  fetch?: typeof fetch;
  /** The variables to read (default `process.env`). */
  env?: Record<string, string | undefined>;
  /**
   * File the rotated pair is persisted to (default `SIGNOZ_TOKEN_FILE` or `.signoz-session.json`).
   * `false` turns persistence off. Does not apply to the API key.
   */
  tokenFile?: string | false;
}

/**
 * Creates the client from `SIGNOZ_BASE_URL` and from `SIGNOZ_API_KEY` **or** the
 * `SIGNOZ_AUTH_TOKEN`/`SIGNOZ_REFRESH_AUTH_TOKEN` pair. The API key takes precedence.
 *
 * With the pair: if the session file descends from the `.env` pair (the `.env` has not changed), the
 * file's pair wins, being newer; if the `.env` changed, the `.env` wins.
 */
export function createSignozClientFromEnv(options: FromEnvOptions = {}): SignozClient {
  const env = options.env ?? process.env;
  const baseUrl = requireString(options.baseUrl ?? env.SIGNOZ_BASE_URL, "SIGNOZ_BASE_URL", "the SigNoz instance URL");
  assertUrl(baseUrl);
  const common = { baseUrl, timeoutMs: options.timeoutMs, fetch: options.fetch };
  const apiKey = options.apiKey ?? env.SIGNOZ_API_KEY;
  if (hasText(apiKey)) return buildApiKeyClient({ ...common, apiKey: apiKey.trim() });

  const validated = {
    authToken: requireString(
      options.authToken ?? env.SIGNOZ_AUTH_TOKEN,
      "SIGNOZ_AUTH_TOKEN",
      "the AUTH_TOKEN localStorage key, or set SIGNOZ_API_KEY"
    ),
    refreshAuthToken: requireString(
      options.refreshAuthToken ?? env.SIGNOZ_REFRESH_AUTH_TOKEN,
      "SIGNOZ_REFRESH_AUTH_TOKEN",
      "the REFRESH_AUTH_TOKEN localStorage key"
    ),
  };
  const tokenFile = options.tokenFile ?? env.SIGNOZ_TOKEN_FILE ?? ".signoz-session.json";
  const tokenStore = tokenFile === false ? undefined : new FileTokenStore(tokenFile);
  const { tokens, source } = resolveInitialTokens(validated, tokenStore);
  return buildSessionClient(
    { ...common, ...validated, onTokensRotated: options.onTokensRotated, tokenStore },
    tokens,
    source
  );
}
