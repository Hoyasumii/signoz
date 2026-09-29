import * as fs from "node:fs";

/** How many times {@link renameWithRetry} tries before giving up. */
export const RENAME_ATTEMPTS = 5;

/** Errors Windows raises while another process (antivirus, an editor, the indexer) holds the file. */
const LOCKED = new Set(["EPERM", "EBUSY", "EACCES"]);

export interface RenameOptions {
  platform?: NodeJS.Platform;
  rename?: (from: string, to: string) => void;
  sleep?: (ms: number) => void;
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * `renameSync`, retried on win32 while the target is locked: 50 ms, 100 ms, 200 ms… up to
 * {@link RENAME_ATTEMPTS} tries. Anywhere else, or for any other error, it throws at once. The
 * error that escapes names the target.
 */
export function renameWithRetry(from: string, to: string, options: RenameOptions = {}): void {
  const { platform = process.platform, rename = fs.renameSync, sleep = sleepSync } = options;
  for (let attempt = 1; ; attempt++) {
    try {
      rename(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "";
      if (platform !== "win32" || !LOCKED.has(code) || attempt >= RENAME_ATTEMPTS) {
        if (error instanceof Error && !error.message.includes(to)) error.message += ` (renaming onto ${to})`;
        throw error;
      }
      sleep(50 * 2 ** (attempt - 1));
    }
  }
}
