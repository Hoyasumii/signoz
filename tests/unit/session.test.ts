import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createSignozClient,
  FileTokenStore,
  type RotatedTokens,
  SignozApiError,
  SignozSessionExpiredError,
  tokenPairHash,
} from "../../src/index";
import { envelope, FakeSignoz, renderError, ROTATE, rotator } from "./fake-server";

let server: FakeSignoz | undefined;
afterEach(async () => server?.stop());

const ME = "/api/v2/users/me";

/** Only accepts the `valid` access token; rotate swaps `a1/r1` for `a2/r2`. */
function sessionServer(
  valid: () => string,
  rotate = rotator([
    ["a1", "r1"],
    ["a2", "r2"],
  ])
) {
  return FakeSignoz.start(async (_req, seen) => {
    if (seen.path === ROTATE) return rotate(seen);
    if (seen.authorization !== `Bearer ${valid()}`) return renderError(401, "unauthenticated", "token expired");
    return envelope({ id: "u1", email: "alan@example.com" });
  });
}

describe("automatic rotate", () => {
  test("401 → rotate with the current Bearer + refreshToken → retries the call", async () => {
    server = await sessionServer(() => "a2");
    const rotated: RotatedTokens[] = [];
    const client = createSignozClient({
      baseUrl: server.url,
      authToken: "a1",
      refreshAuthToken: "r1",
      onTokensRotated: (t) => {
        rotated.push(t);
      },
    });

    const me = await client.users.getMyUser();

    expect(me).toEqual({ id: "u1", email: "alan@example.com" });
    const rotate = server.seen.find((s) => s.path === ROTATE);
    expect(rotate?.authorization).toBe("Bearer a1");
    expect(JSON.parse(rotate?.body ?? "{}")).toEqual({ refreshToken: "r1" });
    expect(server.seen.filter((s) => s.path === ME).map((s) => s.authorization)).toEqual(["Bearer a1", "Bearer a2"]);
    expect(rotated).toEqual([{ authToken: "a2", refreshAuthToken: "r2", expiresIn: 1800 }]);
    expect(client.tokens).toEqual({ authToken: "a2", refreshAuthToken: "r2" });
  });

  test("N concurrent calls with a 401 make a single rotate", async () => {
    server = await sessionServer(() => "a2");
    const client = createSignozClient({ baseUrl: server.url, authToken: "a1", refreshAuthToken: "r1" });

    const results = await Promise.all(Array.from({ length: 8 }, () => client.users.getMyUser()));

    expect(results).toHaveLength(8);
    expect(server.count(ROTATE)).toBe(1);
    expect(server.count(ME)).toBe(16);
  });

  test("a call sent with the old token after the rotate just retries, with no second rotate", async () => {
    let releaseSlow: () => void = () => {};
    const slowGate = new Promise<void>((r) => {
      releaseSlow = r;
    });
    const rotate = rotator([
      ["a1", "r1"],
      ["a2", "r2"],
    ]);
    server = await FakeSignoz.start(async (_req, seen) => {
      if (seen.path === ROTATE) return rotate(seen);
      if (seen.path === "/slow") {
        await slowGate;
        return renderError(401, "unauthenticated", "token expired"); // sent with a1, gets its 401 late
      }
      if (seen.authorization !== "Bearer a2") return renderError(401, "unauthenticated", "token expired");
      return envelope({ ok: true });
    });
    const client = createSignozClient({ baseUrl: server.url, authToken: "a1", refreshAuthToken: "r1" });

    const slow = client.request("GET", "/slow").catch((e) => e);
    await client.users.getMyUser(); // causes the a1 → a2 rotate
    releaseSlow();
    const slowResult = await slow;

    expect(server.count(ROTATE)).toBe(1);
    expect(server.seen.filter((s) => s.path === "/slow").map((s) => s.authorization)).toEqual([
      "Bearer a1",
      "Bearer a2",
    ]);
    expect(slowResult).toBeInstanceOf(SignozApiError); // /slow always answers 401; what matters is that it did not rotate again
  });

  test("rotate with 401 → SignozSessionExpiredError", async () => {
    server = await sessionServer(() => "never", rotator([]));
    const client = createSignozClient({ baseUrl: server.url, authToken: "a1", refreshAuthToken: "r1" });

    const err = await client.users.getMyUser().catch((e) => e);

    expect(err).toBeInstanceOf(SignozSessionExpiredError);
    expect(err.status).toBe(401);
  });

  test("rotate with 500 is not an expired session", async () => {
    server = await sessionServer(
      () => "never",
      async () => renderError(500, "internal", "boom", "internal")
    );
    const client = createSignozClient({ baseUrl: server.url, authToken: "a1", refreshAuthToken: "r1" });

    const err = await client.users.getMyUser().catch((e) => e);

    expect(err).toBeInstanceOf(SignozApiError);
    expect(err).not.toBeInstanceOf(SignozSessionExpiredError);
    expect(err.status).toBe(500);
  });

  test("an operation without security in the spec (authzCheck) sends the Bearer but a 401 does not rotate", async () => {
    server = await sessionServer(() => "never");
    const client = createSignozClient({ baseUrl: server.url, authToken: "a1", refreshAuthToken: "r1" });

    const err = await client.authz.authzCheck({ body: [] as never }).catch((e) => e);

    expect(err).toBeInstanceOf(SignozApiError);
    expect(err.status).toBe(401);
    expect(server.seen[0]?.authorization).toBe("Bearer a1");
    expect(server.count(ROTATE)).toBe(0);
  });

  test("sessions.rotateSession() rotates the client's state", async () => {
    server = await sessionServer(() => "a2");
    const client = createSignozClient({ baseUrl: server.url, authToken: "a1", refreshAuthToken: "r1" });

    const rotated = await client.sessions.rotateSession();

    expect(rotated).toEqual({ authToken: "a2", refreshAuthToken: "r2", expiresIn: 1800 });
    expect(client.tokens?.authToken).toBe("a2");
    await client.users.getMyUser();
    expect(server.seen.at(-1)?.authorization).toBe("Bearer a2");
  });

  test("sessions.deleteSession() ends the client", async () => {
    server = await FakeSignoz.start(async (_req, seen) =>
      seen.path === "/api/v2/sessions" ? new Response(null, { status: 204 }) : envelope({})
    );
    const client = createSignozClient({ baseUrl: server.url, authToken: "a1", refreshAuthToken: "r1" });

    await client.sessions.deleteSession();
    const err = await client.users.getMyUser().catch((e) => e);

    expect(server.seen[0]?.authorization).toBe("Bearer a1");
    expect(err).toBeInstanceOf(SignozSessionExpiredError);
    expect(server.count(ME)).toBe(0);
  });

  test("rotate with 401 rereads the FileTokenStore and uses a newer pair saved by another process", async () => {
    const dir = mkdtempSync(join(tmpdir(), "signoz-sdk-"));
    const store = new FileTokenStore(join(dir, "session.json"));
    server = await sessionServer(() => "a9", rotator([]));
    const client = createSignozClient({
      baseUrl: server.url,
      authToken: "a1",
      refreshAuthToken: "r1",
      tokenStore: store,
    });
    // another process rotated and saved a9/r9, descending from the same originating pair
    store.save({
      authToken: "a9",
      refreshAuthToken: "r9",
      source: tokenPairHash({ authToken: "a1", refreshAuthToken: "r1" }),
      savedAt: new Date().toISOString(),
    });

    const me = await client.users.getMyUser();

    expect(me).toBeDefined();
    expect(client.tokens).toEqual({ authToken: "a9", refreshAuthToken: "r9" });
  });
});
