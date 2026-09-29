import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { renameWithRetry } from "../fs-util";

import type { SessionTokens } from "./session";

/** What gets saved: the current pair and which pair (from the `.env`/browser) it descends from. */
export interface StoredSession extends SessionTokens {
  /** SHA-256 of the originating pair (see {@link tokenPairHash}). */
  source: string;
  savedAt: string;
}

/** Persistence for the rotated pair, so the next run does not start with an expired token. */
export interface TokenStore {
  load(): StoredSession | null;
  save(session: StoredSession): void | Promise<void>;
}

/** Hash of the token pair, used to tell whether the `.env` changed since the file was saved. */
export function tokenPairHash(tokens: SessionTokens): string {
  return createHash("sha256").update(`${tokens.authToken}\n${tokens.refreshAuthToken}`).digest("hex");
}

/**
 * Keeps the session in a JSON file with mode 0600 (on Windows the mode does not apply: the directory's
 * ACL, such as `%APPDATA%`'s, protects it).
 * Default `.signoz-session.json`, in `.gitignore`.
 */
export class FileTokenStore implements TokenStore {
  constructor(readonly path = ".signoz-session.json") {}

  load(): StoredSession | null {
    if (!existsSync(this.path)) return null;
    try {
      const data = JSON.parse(readFileSync(this.path, "utf8")) as Partial<StoredSession>;
      if (
        typeof data.authToken === "string" &&
        data.authToken &&
        typeof data.refreshAuthToken === "string" &&
        data.refreshAuthToken &&
        typeof data.source === "string"
      ) {
        return {
          authToken: data.authToken,
          refreshAuthToken: data.refreshAuthToken,
          source: data.source,
          savedAt: typeof data.savedAt === "string" ? data.savedAt : "",
        };
      }
    } catch {
      // corrupt file: treated as missing, overwritten on the next rotate
    }
    return null;
  }

  save(session: StoredSession): void {
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    const tmp = `${this.path}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(session, null, 2), { mode: 0o600 });
    chmodSync(tmp, 0o600);
    // On Windows the rename fails with EPERM/EBUSY while another process holds the file.
    renameWithRetry(tmp, this.path);
  }
}

/**
 * Picks the initial pair: the file's, if it descends from the given pair (the `.env` has not changed);
 * otherwise the given one (the user pasted fresh tokens from the browser).
 */
export function resolveInitialTokens(
  given: SessionTokens,
  store: TokenStore | undefined
): { tokens: SessionTokens; source: string } {
  const source = tokenPairHash(given);
  const stored = store?.load();
  if (stored && stored.source === source) {
    return {
      tokens: {
        authToken: stored.authToken,
        refreshAuthToken: stored.refreshAuthToken,
      },
      source,
    };
  }
  return { tokens: given, source };
}
