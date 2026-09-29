import { parse } from "yaml";

import { createSignozClient, OPERATION_METHODS, OPERATIONS, type OperationId } from "../../src/index";
import { envelope, FakeSignoz, readSpecText } from "./fake-server";

const spec = parse(readSpecText(), {
  maxAliasCount: -1,
});
const specOps: { id: string; method: string; path: string }[] = [];
for (const [path, item] of Object.entries<Record<string, { operationId: string }>>(spec.paths)) {
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const op = item[method];
    if (op) specOps.push({ id: op.operationId, method: method.toUpperCase(), path });
  }
}

let server: FakeSignoz;
beforeAll(async () => {
  server = await FakeSignoz.start((_req, seen) => {
    if (seen.path.startsWith("/api/v1/complete/"))
      return new Response(null, { status: 303, headers: { Location: "/" } });
    if (seen.path === "/api/v2/sessions/rotate") {
      return envelope({ accessToken: "a1", refreshToken: "r1", expiresIn: 1800, tokenType: "bearer" });
    }
    return envelope({});
  });
});
afterAll(() => server.stop());

describe("spec v0.142.1 coverage", () => {
  test("241 operations, all in the table, with the spec's method and path", () => {
    expect(specOps).toHaveLength(241);
    expect(Object.keys(OPERATIONS)).toHaveLength(241);
    for (const op of specOps) {
      const generated = OPERATIONS[op.id as OperationId];
      expect([op.id, generated !== undefined]).toEqual([op.id, true]);
      expect({ method: generated.method as string, path: generated.path as string }).toEqual({
        method: op.method,
        path: op.path,
      });
    }
  });

  test("response modes: 164 envelope, 69 empty, 1 raw, 4 prometheus, 3 redirect", () => {
    const modes: Record<string, number> = {};
    for (const op of Object.values(OPERATIONS)) modes[op.mode] = (modes[op.mode] ?? 0) + 1;
    expect(modes).toEqual({ envelope: 164, empty: 69, raw: 1, prometheus: 4, redirect: 3 });
  });

  test("every operationId has a client method, and every call sends the Bearer", async () => {
    const client = createSignozClient({
      baseUrl: server.url,
      authToken: "a1",
      refreshAuthToken: "r1",
    }) as unknown as Record<string, Record<string, (args?: unknown) => Promise<unknown>>>;
    let called = 0;
    for (const [id, refs] of Object.entries(OPERATION_METHODS)) {
      const op = OPERATIONS[id as OperationId];
      expect([id, refs.length > 0]).toEqual([id, true]);
      for (const [ns, method] of refs) {
        const fn = client[ns]?.[method];
        expect([`${ns}.${method}`, typeof fn]).toEqual([`${ns}.${method}`, "function"]);
      }
      const [ns, method] = refs[0] as readonly [string, string];
      if (op.id === "DeleteSession") continue; // ends the client; covered in session.test.ts
      const pathParams = Object.fromEntries([...op.path.matchAll(/\{([^}]+)\}/g)].map((m) => [m[1], "x"]));
      const before = server.seen.length;
      await client[ns]?.[method]?.({ path: pathParams, body: "body" in op ? {} : undefined });
      const req = server.seen[before];
      expect([id, req?.authorization]).toEqual([id, "Bearer a1"]);
      expect([id, req?.method]).toEqual([id, op.method]);
      called++;
    }
    expect(called).toBe(240);
  });
});
