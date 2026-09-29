import { parse } from "yaml";

import {
  createSignozClient,
  OPERATIONS,
  type OperationId,
  SignozConfigError,
  SignozTimeoutError,
} from "../../src/index";
import { envelope, FakeSignoz, renderError, ROTATE, rotator, readSpecText } from "./fake-server";

let server: FakeSignoz | undefined;
afterEach(async () => server?.stop());

const creds = { authToken: "a1", refreshAuthToken: "r1" };

describe("timeoutMs (review 001, B1)", () => {
  test.each([Number.POSITIVE_INFINITY, 0])("%p turns the timeout off", async (timeoutMs) => {
    server = await FakeSignoz.start(() => envelope({ id: "u1" }));
    const c = createSignozClient({ baseUrl: server.url, ...creds, timeoutMs });
    expect(await c.users.getMyUser()).toEqual({ id: "u1" } as never);
  });

  test.each([-1, Number.NaN, 2 ** 31])("%p → SignozConfigError", (timeoutMs) => {
    expect(() => createSignozClient({ baseUrl: "https://s.example.com", ...creds, timeoutMs })).toThrow(
      SignozConfigError
    );
  });

  test("slow response → SignozTimeoutError", async () => {
    server = await FakeSignoz.start(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return envelope({});
    });
    const c = createSignozClient({ baseUrl: server.url, ...creds, timeoutMs: 50 });
    expect(await c.users.getMyUser().catch((e) => e)).toBeInstanceOf(SignozTimeoutError);
  });
});

describe("{ raw: true } (review 001, B2)", () => {
  test("an SSO callback with raw still does not follow the redirect", async () => {
    server = await FakeSignoz.start(() => new Response(null, { status: 303, headers: { Location: "/home" } }));
    const c = createSignozClient({ baseUrl: server.url, ...creds });
    const res = await c.sessions.createSessionByGoogleCallback({ raw: true });
    expect(res.status).toBe(303);
    expect(server.seen).toHaveLength(1);
  });

  test("rotateSession always returns the new pair", async () => {
    const rotate = rotator([
      ["a1", "r1"],
      ["a2", "r2"],
    ]);
    server = await FakeSignoz.start((_req, seen) => rotate(seen));
    const c = createSignozClient({ baseUrl: server.url, ...creds });
    const rotated = await c.sessions.rotateSession();
    expect(rotated).toEqual({ authToken: "a2", refreshAuthToken: "r2", expiresIn: 1800 });
  });
});

describe("robustness", () => {
  test("lowercase caller headers neither duplicate nor replace Authorization", async () => {
    server = await FakeSignoz.start(() => envelope({}));
    const c = createSignozClient({ baseUrl: server.url, ...creds });
    await c.users.getMyUser({ headers: { authorization: "Bearer other", "x-trace": "1" } });
    expect(server.seen[0]?.authorization).toBe("Bearer a1");
  });

  test("an onTokensRotated that throws does not fail the call", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const rotate = rotator([
      ["a1", "r1"],
      ["a2", "r2"],
    ]);
    server = await FakeSignoz.start((_req, seen) => {
      if (seen.path === ROTATE) return rotate(seen);
      return seen.authorization === "Bearer a2" ? envelope({ ok: 1 }) : renderError(401, "unauthenticated", "x");
    });
    const c = createSignozClient({
      baseUrl: server.url,
      ...creds,
      onTokensRotated: () => {
        throw new Error("disk full");
      },
    });
    expect(await c.users.getMyUser()).toEqual({ ok: 1 } as never);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]?.[0])).not.toContain("a2");
    warn.mockRestore();
  });
});

const spec = parse(readSpecText(), {
  maxAliasCount: -1,
});

// oxlint-disable typescript/no-explicit-any -- the spec is untyped YAML
describe("response mode per operation (review 001, S1)", () => {
  test("the classification matches the spec, operation by operation", () => {
    for (const item of Object.values<Record<string, any>>(spec.paths) as Record<string, any>[]) {
      for (const method of ["get", "post", "put", "patch", "delete"]) {
        const o = item[method];
        if (!o) continue;
        const success = Object.entries<any>(o.responses).filter(([code]) => code.startsWith("2"));
        const ref: string | undefined = success[0]?.[1].content?.["application/json"]?.schema?.$ref;
        const expected =
          o.operationId === "HandleExportRawDataPOST"
            ? "raw"
            : success.length === 0
              ? "redirect"
              : !success[0]?.[1].content
                ? "empty"
                : ref?.endsWith("/PrometheusSuccessResponseSchema")
                  ? "prometheus"
                  : "envelope";
        expect([o.operationId, OPERATIONS[o.operationId as OperationId].mode]).toEqual([o.operationId, expected]);
      }
    }
  });
});
