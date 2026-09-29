import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createSignozClientFromEnv, FileTokenStore, tokenPairHash } from "../../src/index";
import { envelope, FakeSignoz, renderError, ROTATE, rotator } from "./fake-server";

let server: FakeSignoz | undefined;
afterEach(async () => server?.stop());

const tmpFile = () => join(mkdtempSync(join(tmpdir(), "signoz-sdk-")), "session.json");

describe("FileTokenStore", () => {
  test("rotate saves the new pair with mode 0600 and the originating pair's hash", async () => {
    const file = tmpFile();
    server = await FakeSignoz.start(async (_req, seen) => {
      if (seen.path === ROTATE)
        return rotator([
          ["a1", "r1"],
          ["a2", "r2"],
        ])(seen);
      return seen.authorization === "Bearer a2" ? envelope({}) : renderError(401, "unauthenticated", "expired");
    });
    const client = createSignozClientFromEnv({
      env: { SIGNOZ_BASE_URL: server.url, SIGNOZ_AUTH_TOKEN: "a1", SIGNOZ_REFRESH_AUTH_TOKEN: "r1" },
      tokenFile: file,
    });

    await client.users.getMyUser();

    const stored = JSON.parse(readFileSync(file, "utf8"));
    expect(stored).toMatchObject({
      authToken: "a2",
      refreshAuthToken: "r2",
      source: tokenPairHash({ authToken: "a1", refreshAuthToken: "r1" }),
    });
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  test("a file descending from the current .env wins over the .env", () => {
    const file = tmpFile();
    new FileTokenStore(file).save({
      authToken: "a2",
      refreshAuthToken: "r2",
      source: tokenPairHash({ authToken: "a1", refreshAuthToken: "r1" }),
      savedAt: "2026-09-24T00:00:00Z",
    });
    const client = createSignozClientFromEnv({
      env: { SIGNOZ_BASE_URL: "https://s.example.com", SIGNOZ_AUTH_TOKEN: "a1", SIGNOZ_REFRESH_AUTH_TOKEN: "r1" },
      tokenFile: file,
    });
    expect(client.tokens).toEqual({ authToken: "a2", refreshAuthToken: "r2" });
  });

  test("a .env with fresh tokens (pasted from the browser) wins over the old file", () => {
    const file = tmpFile();
    new FileTokenStore(file).save({
      authToken: "a2",
      refreshAuthToken: "r2",
      source: tokenPairHash({ authToken: "a1", refreshAuthToken: "r1" }),
      savedAt: "2026-09-24T00:00:00Z",
    });
    const client = createSignozClientFromEnv({
      env: { SIGNOZ_BASE_URL: "https://s.example.com", SIGNOZ_AUTH_TOKEN: "b1", SIGNOZ_REFRESH_AUTH_TOKEN: "s1" },
      tokenFile: file,
    });
    expect(client.tokens).toEqual({ authToken: "b1", refreshAuthToken: "s1" });
  });

  test("a corrupt file is ignored", async () => {
    const file = tmpFile();
    writeFileSync(file, "{not json");
    expect(new FileTokenStore(file).load()).toBeNull();
  });
});
