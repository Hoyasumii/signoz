import { createSignozClient, createSignozClientFromEnv, SignozApiError, SignozConfigError } from "../../src/index";
import { envelope, FakeSignoz, renderError, ROTATE } from "./fake-server";

let server: FakeSignoz | undefined;
afterEach(async () => server?.stop());

const KEY = "sa-key-secret-789";

describe("service account API key", () => {
  test("sends SigNoz-Api-Key and no Authorization", async () => {
    server = await FakeSignoz.start(() => envelope({ id: "u1" }));
    const client = createSignozClient({ baseUrl: server.url, apiKey: KEY });
    expect(client.auth).toBe("api_key");
    expect(client.tokens).toBeUndefined();
    await client.users.getMyUser();
    expect(server.seen[0]?.apiKey).toBe(KEY);
    expect(server.seen[0]?.authorization).toBeNull();
  });

  test("a caller header with the same name is ignored", async () => {
    server = await FakeSignoz.start(() => envelope({ id: "u1" }));
    const client = createSignozClient({ baseUrl: server.url, apiKey: KEY });
    await client.users.getMyUser({ headers: { "SigNoz-Api-Key": "other", Authorization: "Bearer x" } });
    expect(server.seen[0]?.apiKey).toBe(KEY);
    expect(server.seen[0]?.authorization).toBeNull();
  });

  test("401 does not rotate and becomes a SignozApiError without the key", async () => {
    server = await FakeSignoz.start(() => renderError(401, "unauthenticated", `invalid key ${KEY}`));
    const client = createSignozClient({ baseUrl: server.url, apiKey: KEY });
    const error = await client.users.getMyUser().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SignozApiError);
    expect((error as SignozApiError).status).toBe(401);
    expect((error as Error).message).not.toContain(KEY);
    expect(JSON.stringify((error as SignozApiError).body)).not.toContain(KEY);
    expect(server.count(ROTATE)).toBe(0);
  });

  test("the generic request() uses the key too", async () => {
    server = await FakeSignoz.start(() => envelope({ ok: true }));
    const client = createSignozClient({ baseUrl: server.url, apiKey: KEY });
    await expect(client.request("GET", "/api/v1/something")).resolves.toEqual({ ok: true });
    expect(server.seen[0]?.apiKey).toBe(KEY);
  });

  test("rotateSession() refuses with an API key", async () => {
    server = await FakeSignoz.start(() => envelope({}));
    const client = createSignozClient({ baseUrl: server.url, apiKey: KEY });
    await expect(client.sessions.rotateSession()).rejects.toBeInstanceOf(SignozConfigError);
  });

  test("apiKey and a token pair together are refused", () => {
    expect(() =>
      createSignozClient({ baseUrl: "http://x", apiKey: KEY, authToken: "a", refreshAuthToken: "r" } as never)
    ).toThrow(SignozConfigError);
  });

  test("fromEnv: SIGNOZ_API_KEY takes precedence over the pair", async () => {
    server = await FakeSignoz.start(() => envelope({ id: "u1" }));
    const client = createSignozClientFromEnv({
      env: {
        SIGNOZ_BASE_URL: server.url,
        SIGNOZ_API_KEY: KEY,
        SIGNOZ_AUTH_TOKEN: "a1",
        SIGNOZ_REFRESH_AUTH_TOKEN: "r1",
      },
      tokenFile: false,
    });
    expect(client.auth).toBe("api_key");
    await client.users.getMyUser();
    expect(server.seen[0]?.apiKey).toBe(KEY);
  });

  test("fromEnv with neither key nor pair explains both options", () => {
    expect(() => createSignozClientFromEnv({ env: { SIGNOZ_BASE_URL: "http://x" }, tokenFile: false })).toThrow(
      /SIGNOZ_API_KEY/
    );
  });
});
