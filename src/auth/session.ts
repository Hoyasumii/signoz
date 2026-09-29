import { SignozApiError, SignozSessionExpiredError } from "../errors";
import type { TokenStore } from "./file-token-store";

/** The two values the SigNoz frontend keeps in localStorage. */
export interface SessionTokens {
  /** `AUTH_TOKEN` */
  authToken: string;
  /** `REFRESH_AUTH_TOKEN` */
  refreshAuthToken: string;
}

export interface RotatedTokens extends SessionTokens {
  /** Seconds until the next rotation the server suggests. */
  expiresIn?: number;
}

export type OnTokensRotated = (tokens: RotatedTokens) => void | Promise<void>;

/** Sends `POST /api/v2/sessions/rotate` with the given pair; throws `SignozApiError` on a non-2xx response. */
type RotateCall = (tokens: SessionTokens) => Promise<RotatedTokens>;

interface SessionOptions {
  tokens: SessionTokens;
  rotateCall: RotateCall;
  onTokensRotated?: OnTokensRotated;
  tokenStore?: TokenStore;
  /** Hash of the originating pair, saved alongside it in the `tokenStore`. */
  tokenSource?: string;
}

/**
 * The token state of a SigNoz session.
 *
 * The rotate is single-flight: N calls that get a 401 with the same access token trigger a single
 * `POST /sessions/rotate`; a call that got a 401 with a token already replaced just retries.
 */
export class Session {
  #tokens: SessionTokens;
  #inflight: Promise<void> | undefined;
  #loggedOut = false;
  readonly #rotateCall: RotateCall;
  readonly #onTokensRotated?: OnTokensRotated;
  readonly #tokenStore?: TokenStore;
  readonly #tokenSource?: string;

  constructor(options: SessionOptions) {
    this.#tokens = { ...options.tokens };
    this.#rotateCall = options.rotateCall;
    this.#onTokensRotated = options.onTokensRotated;
    this.#tokenStore = options.tokenStore;
    this.#tokenSource = options.tokenSource;
  }

  /** The current pair (a copy). Useful to persist it yourself. */
  get tokens(): SessionTokens {
    return { ...this.#tokens };
  }

  get accessToken(): string {
    return this.#tokens.authToken;
  }

  get loggedOut(): boolean {
    return this.#loggedOut;
  }

  /** Values that must never show up in an error. */
  get secrets(): string[] {
    return [this.#tokens.authToken, this.#tokens.refreshAuthToken];
  }

  /**
   * Called after a 401 on a request made with `usedAccessToken`.
   * Resolves once there is a newer pair to retry the call with; throws if the session is over.
   */
  async refreshAfterUnauthorized(usedAccessToken: string): Promise<void> {
    if (this.#loggedOut) throw this.#expired("session ended by deleteSession()");
    if (usedAccessToken !== this.#tokens.authToken) return; // another rotate already replaced the pair
    if (!this.#inflight) {
      this.#inflight = this.#rotate().finally(() => {
        this.#inflight = undefined;
      });
    }
    await this.#inflight;
  }

  /** Explicit rotate (`sdk.sessions.rotateSession()`): uses the same single-flight and returns the new pair. */
  async rotateNow(): Promise<RotatedTokens> {
    if (this.#loggedOut) throw this.#expired("session ended by deleteSession()");
    if (!this.#inflight) {
      this.#inflight = this.#rotate().finally(() => {
        this.#inflight = undefined;
      });
    }
    await this.#inflight;
    return { ...this.#tokens, expiresIn: this.#lastExpiresIn };
  }

  /** After `DELETE /api/v2/sessions`: no authenticated call goes out through this session anymore. */
  markLoggedOut(): void {
    this.#loggedOut = true;
  }

  #lastExpiresIn: number | undefined;

  async #rotate(): Promise<void> {
    let rotated: RotatedTokens;
    try {
      rotated = await this.#rotateCall(this.#tokens);
    } catch (err) {
      if (err instanceof SignozApiError && err.status === 401) {
        // Another process may have rotated and saved a newer pair (opaque tokenizer).
        const stored = this.#tokenStore?.load();
        if (
          stored &&
          (stored.source === this.#tokenSource || this.#tokenSource === undefined) &&
          stored.authToken !== this.#tokens.authToken
        ) {
          this.#tokens = {
            authToken: stored.authToken,
            refreshAuthToken: stored.refreshAuthToken,
          };
          this.#lastExpiresIn = undefined;
          return;
        }
        throw this.#expired(err.message, err);
      }
      throw err;
    }
    this.#tokens = {
      authToken: rotated.authToken,
      refreshAuthToken: rotated.refreshAuthToken,
    };
    this.#lastExpiresIn = rotated.expiresIn;
    // The rotate already happened on the server: a failure to persist or in the callback must not fail the call.
    try {
      await this.#tokenStore?.save({
        ...this.#tokens,
        source: this.#tokenSource ?? "",
        savedAt: new Date().toISOString(),
      });
    } catch (err) {
      // oxlint-disable-next-line no-console -- the rotate already happened; warning without the tokens is all that is left
      console.warn(`[signoz-sdk] failed to save the rotated session: ${(err as Error)?.message ?? err}`);
    }
    try {
      await this.#onTokensRotated?.({ ...rotated });
    } catch (err) {
      // oxlint-disable-next-line no-console -- likewise: the caller's callback failed after the rotate
      console.warn(`[signoz-sdk] onTokensRotated threw: ${(err as Error)?.message ?? err}`);
    }
  }

  #expired(message: string, cause?: SignozApiError): SignozSessionExpiredError {
    return new SignozSessionExpiredError({
      status: 401,
      method: "POST",
      path: "/api/v2/sessions/rotate",
      operationId: "RotateSession",
      code: cause?.code,
      type: cause?.type,
      message: `session expired; copy AUTH_TOKEN and REFRESH_AUTH_TOKEN from the browser again (${message})`,
      body: cause?.body,
    });
  }
}
