import { durationMs, resolveWindow, stepFor } from "../../../src/mcp/query/time";
import { andFilter, builderSpec, envelopes, formatRange, quoteValue } from "../../../src/mcp/query/v5";

describe("time windows", () => {
  const now = Date.parse("2026-09-25T12:00:00Z");

  it("takes a look-back or explicit bounds in ISO, seconds or milliseconds", () => {
    expect(durationMs("15m")).toBe(900_000);
    expect(resolveWindow({}, now)).toEqual({ start: now - 3_600_000, end: now });
    expect(resolveWindow({ since: "2d" }, now).start).toBe(now - 2 * 86_400_000);
    expect(resolveWindow({ start: "2026-09-25T11:00:00Z", end: now / 1000 }, now)).toEqual({
      start: now - 3_600_000,
      end: now,
    });
  });

  it("refuses an empty window or a bad duration", () => {
    expect(() => resolveWindow({ start: now, end: now - 1 }, now)).toThrow("start must be before end");
    expect(() => durationMs("5 minutes")).toThrow("is not a duration");
    expect(() => resolveWindow({ start: "yesterday" }, now)).toThrow("is not a date");
  });

  it("picks a step that gives at most ~120 points", () => {
    expect(stepFor({ start: 0, end: 3_600_000 })).toBe(60);
    expect(stepFor({ start: 0, end: 86_400_000 })).toBe(900);
    expect(stepFor({ start: 0, end: 30 * 86_400_000 })).toBe(21600);
  });
});

describe("v5 queries", () => {
  it("joins filters, quoting values and parenthesising ORs", () => {
    expect(andFilter(undefined, " ", "a = 1")).toBe("a = 1");
    expect(andFilter("a = 1", "b = 2 OR c = 3")).toBe("a = 1 AND (b = 2 OR c = 3)");
    expect(quoteValue("it's")).toBe("'it\\'s'");
  });

  it("builds builder specs with plain strings turned into v5 objects", () => {
    expect(
      builderSpec(
        {
          signal: "traces",
          aggregations: ["count()", "p95(duration_nano)"],
          filter: "service.name = 'x'",
          groupBy: ["http.route"],
          orderBy: [{ key: "count()" }],
          limit: 10,
        },
        1,
        60
      )
    ).toEqual({
      name: "B",
      signal: "traces",
      aggregations: [{ expression: "count()" }, { expression: "p95(duration_nano)" }],
      filter: { expression: "service.name = 'x'" },
      groupBy: [{ name: "http.route" }],
      order: [{ key: { name: "count()" }, direction: "desc" }],
      limit: 10,
      stepInterval: 60,
    });
    expect(builderSpec({ signal: "metrics", metric: { name: "m" } }, 0)).toMatchObject({
      aggregations: [{ metricName: "m", timeAggregation: "rate", spaceAggregation: "sum" }],
    });
  });

  it("refuses a metrics query without a metric and packed aggregations", () => {
    expect(() => builderSpec({ signal: "metrics" }, 0)).toThrow("needs `metric`");
    expect(() => builderSpec({ signal: "logs", aggregations: ["count(), sum(x)"] }, 0)).toThrow("packs several calls");
  });

  it("adds formulas after the builder queries", () => {
    const queries = envelopes([{ signal: "logs", aggregations: ["count()"] }], [{ name: "F1", expression: "A * 2" }]);
    expect(queries.map((q) => q.type)).toEqual(["builder_query", "builder_formula"]);
  });

  it("summarises series, maps scalar columns and flattens raw rows", () => {
    const series = formatRange({
      type: "time_series",
      data: {
        results: [
          {
            queryName: "A",
            aggregations: [
              {
                index: 0,
                series: [
                  {
                    labels: [{ key: { name: "service.name" }, value: "api" }],
                    values: [
                      { timestamp: 0, value: 1 },
                      { timestamp: 60_000, value: 5 },
                      { timestamp: 120_000, value: 3 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(series).toEqual({
      type: "time_series",
      results: [
        {
          query: "A",
          aggregations: [
            {
              index: 0,
              seriesCount: 1,
              series: [
                {
                  labels: { "service.name": "api" },
                  summary: { points: 3, min: 1, max: 5, avg: 3, last: 3, peakAt: "1970-01-01T00:01:00.000Z" },
                },
              ],
            },
          ],
        },
      ],
    });
    const scalar = formatRange({
      type: "scalar",
      data: {
        results: [{ queryName: "A", columns: [{ name: "service.name" }, { name: "count()" }], data: [["api", 7]] }],
      },
    }) as { results: { rows: unknown[] }[] };
    expect(scalar.results[0].rows).toEqual([{ "service.name": "api", "count()": 7 }]);
    const raw = formatRange({
      type: "raw",
      data: { results: [{ queryName: "A", rows: [{ timestamp: "t", data: { body: "b" } }], nextCursor: "c" }] },
    }) as { results: unknown[] };
    expect(raw.results[0]).toEqual({ query: "A", count: 1, rows: [{ timestamp: "t", body: "b" }], nextCursor: "c" });
  });
});
