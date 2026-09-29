import { z } from "zod";
import { ToolInputError } from "../catalog";

/** A time window as the tools take it: a look-back (`since`) or explicit bounds. */
export interface TimeWindowInput {
  since?: string;
  start?: string | number;
  end?: string | number;
}

export interface TimeWindow {
  /** Epoch milliseconds. */
  start: number;
  /** Epoch milliseconds. */
  end: number;
}

const UNIT_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

/** The zod fields every telemetry tool takes for its window. */
export const timeWindowShape = {
  since: z
    .string()
    .regex(/^\d+[smhdw]$/, "use a number and a unit: 30m, 6h, 2d, 1w")
    .optional()
    .describe("Look-back window ending now, e.g. '15m', '1h', '24h', '7d'. Default '1h'. Ignored when start is given."),
  start: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Window start: ISO 8601 ('2026-09-25T13:00:00-03:00') or epoch milliseconds."),
  end: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Window end: ISO 8601 or epoch milliseconds. Default: now."),
};

/** Milliseconds in a duration like `15m` or `2d`. */
export function durationMs(text: string): number {
  const match = /^(\d+)([smhdw])$/.exec(text.trim());
  if (!match) throw new ToolInputError(`'${text}' is not a duration: use a number and a unit, e.g. 30m, 6h, 2d.`);
  return Number(match[1]) * UNIT_MS[match[2]];
}

function instant(value: string | number, label: string): number {
  if (typeof value === "number" || /^\d+$/.test(value.trim())) {
    const n = Number(value);
    // Seconds are ~1.7e9 today, milliseconds ~1.7e12: accept either.
    return n < 1e11 ? n * 1000 : n;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new ToolInputError(`${label} is not a date: '${value}'. Use ISO 8601 or epoch ms.`);
  return parsed;
}

/** The window in epoch ms, `since` defaulting to one hour. */
export function resolveWindow(input: TimeWindowInput, now: number = Date.now(), fallback = "1h"): TimeWindow {
  const end = input.end === undefined ? now : instant(input.end, "end");
  const start = input.start === undefined ? end - durationMs(input.since ?? fallback) : instant(input.start, "start");
  if (start >= end) throw new ToolInputError("The window is empty: start must be before end.");
  return { start: Math.floor(start), end: Math.floor(end) };
}

const NICE_STEPS = [60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400];

/** A step in seconds that gives about 60–120 points over the window, never under a minute. */
export function stepFor(window: TimeWindow): number {
  const seconds = (window.end - window.start) / 1000;
  return NICE_STEPS.find((step) => seconds / step <= 120) ?? NICE_STEPS[NICE_STEPS.length - 1];
}

/** The window as the model reads it back. */
export function describeWindow(window: TimeWindow): { start: string; end: string } {
  return { start: new Date(window.start).toISOString(), end: new Date(window.end).toISOString() };
}
