import { createSignozClient, createSignozClientFromEnv, SignozConfigError } from "../../src/index";
import { envelope, FakeSignoz } from "./fake-server";

let server: FakeSignoz | undefined;
afterEach(async () => server?.stop());

describe("createSignozClient requires the session tokens", () => {
  const base = { baseUrl: "https://signoz.example.com", authToken: "a", refreshAuthToken: "r" };

  test.each([
    ["authToken", { ...base, authToken: "" }],
    ["refreshAuthToken", { ...base, refreshAuthToken: "  " }],
    ["baseUrl", { ...base, baseUrl: undefined }],
  ])("without %s → SignozConfigError", (name, options) => {
    expect(() => createSignozClient(options as never)).toThrow(SignozConfigError);
    expect(() => createSignozClient(options as never)).toThrow(name);
  });

  test("invalid baseUrl → SignozConfigError", () => {
    expect(() => createSignozClient({ ...base, baseUrl: "signoz.example.com" })).toThrow(SignozConfigError);
  });

  test("FromEnv without SIGNOZ_REFRESH_AUTH_TOKEN → SignozConfigError", () => {
    expect(() =>
      createSignozClientFromEnv({ env: { SIGNOZ_BASE_URL: base.baseUrl, SIGNOZ_AUTH_TOKEN: "a" }, tokenFile: false })
    ).toThrow("SIGNOZ_REFRESH_AUTH_TOKEN");
  });
});

describe("baseUrl", () => {
  test.each([
    ["no trailing slash", "", ""],
    ["trailing slash", "/", ""],
    ["base path", "/signoz", "/signoz"],
    ["base path and trailing slash", "/signoz/", "/signoz"],
  ])("%s", async (_label, suffix, prefix) => {
    server = await FakeSignoz.start(() => envelope({ id: "u1" }));
    const client = createSignozClient({ baseUrl: server.url + suffix, authToken: "a", refreshAuthToken: "r" });
    await client.users.getMyUser();
    expect(server.seen[0]?.path).toBe(`${prefix}/api/v2/users/me`);
    expect(client.baseUrl).toBe(server.url + prefix);
  });
});
