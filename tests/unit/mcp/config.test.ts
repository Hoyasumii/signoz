import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  authOf,
  clientFor,
  configDir,
  configFilePath,
  missingSettings,
  parseEnv,
  readEnvFile,
  resolveMcpConfig,
  sessionFilePath,
  stateDir,
  writeEnvFile,
} from "../../../src/mcp/config";
import { FakeSignoz, ROTATE, envelope, renderError, rotator } from "../fake-server";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "signoz-config-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("config locations", () => {
  it("uses the per-user config directory of each platform, with its separators", () => {
    expect(configDir({ HOME: "/home/ada" }, "linux")).toBe("/home/ada/.config/signoz");
    expect(configDir({ HOME: "/home/ada", XDG_CONFIG_HOME: "/xdg" }, "linux")).toBe("/xdg/signoz");
    expect(configDir({ HOME: "/Users/ada" }, "darwin")).toBe("/Users/ada/Library/Application Support/signoz");
    expect(configDir({ APPDATA: "C:\\Users\\ada\\AppData\\Roaming" }, "win32")).toBe(
      "C:\\Users\\ada\\AppData\\Roaming\\signoz"
    );
    expect(configDir({ USERPROFILE: "C:\\Users\\ada" }, "win32")).toBe("C:\\Users\\ada\\AppData\\Roaming\\signoz");
  });

  it("puts the .env in it unless SIGNOZ_CONFIG says otherwise, and the run dir and session beside it", () => {
    expect(configFilePath({ HOME: "/home/ada" }, "linux")).toBe("/home/ada/.config/signoz/.env");
    expect(configFilePath({ APPDATA: "C:\\AppData" }, "win32")).toBe("C:\\AppData\\signoz\\.env");
    expect(configFilePath({ HOME: "/home/ada", SIGNOZ_CONFIG: "/etc/x.env" }, "linux")).toBe(
      path.resolve("/etc/x.env")
    );
    expect(stateDir("/home/ada/.config/signoz/.env")).toBe(path.join("/home/ada/.config/signoz", "run"));
    expect(sessionFilePath("/home/ada/.config/signoz/.env")).toBe(
      path.join("/home/ada/.config/signoz", "session.json")
    );
  });
});

describe(".env files", () => {
  it("parses comments, export, quotes, inline comments and CRLF", () => {
    expect(
      parseEnv(
        [
          "# comment",
          "",
          "export SIGNOZ_API_KEY=abc",
          'SIGNOZ_BASE_URL="https://x.test" ',
          "SIGNOZ_ENV='prod # not a comment'",
          "PORT=4000 # inline",
          "not a line",
        ].join("\r\n")
      )
    ).toEqual({
      SIGNOZ_API_KEY: "abc",
      SIGNOZ_BASE_URL: "https://x.test",
      SIGNOZ_ENV: "prod # not a comment",
      PORT: "4000",
    });
  });

  it("reads a missing file as empty and keeps only the known, non-empty keys", () => {
    const file = path.join(dir, ".env");
    expect(readEnvFile(file)).toEqual({});
    fs.writeFileSync(file, "SIGNOZ_API_KEY=k\nSIGNOZ_ENV=\nOTHER=1\n");
    expect(readEnvFile(file)).toEqual({ SIGNOZ_API_KEY: "k" });
  });

  it("writes an owner-only file that reads back the same, with no temp file left", () => {
    const file = path.join(dir, "nested", ".env");
    const values = {
      SIGNOZ_API_KEY: 'a"b\\c d',
      SIGNOZ_BASE_URL: "https://x.test",
      SIGNOZ_AUTH_TOKEN: "t.k.n",
      PORT: "4000",
    };
    writeEnvFile(file, values);
    expect(readEnvFile(file)).toEqual(values);
    if (process.platform !== "win32") expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(path.dirname(file))).toEqual([".env"]);
  });
});

describe("resolveMcpConfig", () => {
  const file = {
    SIGNOZ_API_KEY: "file",
    SIGNOZ_BASE_URL: "https://file.test",
    SIGNOZ_ENV: "f",
    PORT: "1111",
  };

  it("takes flag over environment over file over default", () => {
    expect(resolveMcpConfig({})).toEqual({
      baseUrl: "",
      apiKey: "",
      authToken: "",
      refreshAuthToken: "",
      environment: undefined,
      port: 3767,
    });
    expect(resolveMcpConfig({ file })).toMatchObject({
      apiKey: "file",
      baseUrl: "https://file.test",
      environment: "f",
      port: 1111,
    });
    expect(resolveMcpConfig({ file, env: { SIGNOZ_API_KEY: "env", PORT: "2222", SIGNOZ_ENV: "" } })).toMatchObject({
      apiKey: "env",
      port: 2222,
      environment: "f",
    });
    expect(
      resolveMcpConfig({ file, env: { SIGNOZ_API_KEY: "env" }, flags: { apiKey: "flag", environment: "w", port: "0" } })
    ).toMatchObject({ apiKey: "flag", environment: "w", port: 0 });
  });

  it("refuses a bad port or base URL", () => {
    expect(() => resolveMcpConfig({ flags: { port: "70000" } })).toThrow("PORT must be an integer");
    expect(() => resolveMcpConfig({ flags: { port: "12a" } })).toThrow("PORT must be an integer");
    expect(() => resolveMcpConfig({ flags: { baseUrl: "ftp://x" } })).toThrow("SIGNOZ_BASE_URL is not a valid");
  });

  it("says what is missing: a URL, a credential (an API key or both tokens)", () => {
    const base = { baseUrl: "https://x.test", apiKey: "", authToken: "", refreshAuthToken: "", port: 1 };
    expect(missingSettings({ ...base, baseUrl: "" })).toContain("SIGNOZ_BASE_URL");
    expect(missingSettings(base)).toContain("SIGNOZ_API_KEY");
    expect(missingSettings({ ...base, authToken: "a" })).toContain("SIGNOZ_API_KEY");
    expect(missingSettings({ ...base, authToken: "a", refreshAuthToken: "r" })).toBeUndefined();
    expect(authOf({ apiKey: "k", authToken: "a", refreshAuthToken: "r" })).toBe("api_key");
    expect(authOf({ apiKey: "", authToken: "a", refreshAuthToken: "r" })).toBe("session");
  });
});

describe("clientFor", () => {
  let server: FakeSignoz | undefined;
  afterEach(async () => server?.stop());

  it("prefers the API key", async () => {
    server = await FakeSignoz.start(() => envelope({ id: "u1" }));
    const client = clientFor({ baseUrl: server.url, apiKey: "k", authToken: "a", refreshAuthToken: "r" });
    expect(client.auth).toBe("api_key");
  });

  it("resumes the rotated session from the session file across processes", async () => {
    const rotate = rotator([
      ["a1", "r1"],
      ["a2", "r2"],
    ]);
    server = await FakeSignoz.start(async (_req, seen) => {
      if (seen.path === ROTATE) return rotate(seen);
      return seen.authorization === "Bearer a2"
        ? envelope({ id: "u1" })
        : renderError(401, "unauthenticated", "expired");
    });
    const sessionFile = path.join(dir, "session.json");
    const connection = { baseUrl: server.url, authToken: "a1", refreshAuthToken: "r1", sessionFile };

    await clientFor(connection).users.getMyUser();
    expect(server.count(ROTATE)).toBe(1);
    // A second process from the same saved pair starts from the rotated one: no second rotate.
    await clientFor(connection).users.getMyUser();
    expect(server.count(ROTATE)).toBe(1);
    expect(server.seen.at(-1)?.authorization).toBe("Bearer a2");
  });
});
