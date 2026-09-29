import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SignozClient } from "../../client";
import type { components } from "../../generated/schema";
import { ToolInputError } from "../catalog";
import { describeError } from "../errors";
import {
  DASHBOARD_SCHEMA_VERSION,
  type DashboardSpec,
  type PanelInput,
  type SectionInput,
  buildDashboard,
  buildSections,
  dashboardInputShape,
  panelProbe,
  panelSchema,
  presetSchema,
  sectionSchema,
  sectionsOf,
  tagsOf,
} from "../query/dashboard";
import { describeWindow, resolveWindow, stepFor, timeWindowShape } from "../query/time";
import { type QueryEnvelope, envelopes, formatRange, rangeRequest, runRange } from "../query/v5";
import { READ, type ToolContext, WRITE, dashboardUrl, run } from "./shared";

type Gettable = components["schemas"]["DashboardtypesGettableDashboardV2"];

export interface PanelCheck {
  key?: string;
  section?: string;
  title: string;
  ok: boolean;
  /** Whether the query returned any series or row in the check window. */
  hasData?: boolean;
  error?: string;
}

function hasData(formatted: unknown): boolean {
  const results = (formatted as { results?: Record<string, unknown>[] }).results ?? [];
  return results.some((result) => {
    const aggregations = result.aggregations as { seriesCount?: number }[] | undefined;
    if (aggregations) return aggregations.some((a) => (a.seriesCount ?? 0) > 0);
    const rows = result.rows as unknown[] | undefined;
    return Array.isArray(rows) && rows.length > 0;
  });
}

/** Runs one panel's query against the instance: the error SigNoz gives, or whether it has data. */
export async function checkPanel(
  client: SignozClient,
  panel: PanelInput,
  window: { start: number; end: number }
): Promise<PanelCheck> {
  const probe = panelProbe(panel);
  if (!probe) return { title: panel.title, ok: true };
  try {
    const step = probe.requestType === "time_series" ? stepFor(window) : undefined;
    const queries: QueryEnvelope[] = probe.promql
      ? [{ type: "promql", spec: { name: "A", query: probe.promql, step: step ?? stepFor(window) } } as QueryEnvelope]
      : envelopes(
          probe.requestType === "raw" ? probe.queries.map((q) => ({ ...q, limit: 1 })) : probe.queries,
          probe.formulas,
          step
        );
    const response = await runRange(client, rangeRequest(window, probe.requestType, queries));
    return { title: panel.title, ok: true, hasData: hasData(formatRange(response)) };
  } catch (error) {
    return { title: panel.title, ok: false, error: describeError(error) };
  }
}

async function checkAll(
  client: SignozClient,
  panels: { key?: string; section?: string; panel: PanelInput }[],
  window: { start: number; end: number }
): Promise<PanelCheck[]> {
  const checks: PanelCheck[] = [];
  for (const entry of panels) {
    checks.push({ key: entry.key, section: entry.section, ...(await checkPanel(client, entry.panel, window)) });
  }
  return checks;
}

function summarizeDashboard(client: SignozClient, dashboard: Gettable): Record<string, unknown> {
  const panelTitles = new Map<string, { title: string; kind: string; queries: unknown }>();
  for (const [key, panel] of Object.entries(dashboard.spec.panels ?? {})) {
    panelTitles.set(key, {
      title: panel.spec.display.name,
      kind: String(panel.spec.plugin.kind).replace("signoz/", "").replace("Panel", ""),
      queries: panel.spec.queries.map((q) => q.spec.plugin),
    });
  }
  const sections = (dashboard.spec.layouts ?? []).map((layout) => {
    const spec = layout.spec as { display?: { title?: string }; items?: { content?: { $ref?: string } }[] | null };
    return {
      title: spec.display?.title ?? "",
      panels: (spec.items ?? []).map((item) => {
        const key = item.content?.$ref?.split("/").pop() ?? "";
        return { key, ...panelTitles.get(key) };
      }),
    };
  });
  return {
    id: dashboard.id,
    name: dashboard.name,
    title: dashboard.spec.display.name,
    description: dashboard.spec.display.description,
    tags: dashboard.tags,
    locked: dashboard.locked,
    updatedAt: dashboard.updatedAt,
    url: dashboardUrl(client, dashboard.id),
    sections,
  };
}

const validateShape = {
  validate: z
    .enum(["run", "none"])
    .optional()
    .describe("'run' (default): run every panel's query over the check window first and refuse to save on an error."),
  checkWindow: z
    .string()
    .regex(/^\d+[smhdw]$/)
    .optional()
    .describe("Window the check runs over. Default '1h'."),
};

/** Dashboards: list, read, try a panel, create, extend, share. */
export function registerDashboardTools(server: McpServer, context: ToolContext): void {
  const { client } = context;

  server.registerTool(
    "signoz_list_dashboards",
    {
      title: "List dashboards",
      description: "Dashboards of the organization, newest first: id, title, tags and link. Filter with a search text.",
      inputSchema: {
        search: z.string().optional().describe("Text to match in the name (SigNoz's list filter)."),
        limit: z.number().int().min(1).max(200).optional().describe("Default 50."),
        offset: z.number().int().min(0).optional(),
      },
      annotations: READ,
    },
    async ({ search, limit, offset }) =>
      run(async () => {
        const page = await client.dashboard.listDashboardsV2({
          query: { query: search, limit: limit ?? 50, offset, sort: "updated_at", order: "desc" },
        });
        return {
          total: page.total,
          dashboards: page.dashboards.map((d) => ({
            id: d.id,
            name: d.name,
            title: (d.spec as { display?: { name?: string } } | undefined)?.display?.name ?? d.name,
            tags: d.tags?.map((t) => `${t.key}:${t.value}`),
            updatedAt: d.updatedAt,
            legacy: d.legacy || undefined,
            url: dashboardUrl(client, d.id),
          })),
        };
      })
  );

  server.registerTool(
    "signoz_get_dashboard",
    {
      title: "Get a dashboard",
      description:
        "One dashboard: its sections and panels with their queries and its link. `raw: true` for the full JSON.",
      inputSchema: { id: z.string().min(1), raw: z.boolean().optional() },
      annotations: READ,
    },
    async ({ id, raw }) =>
      run(async () => {
        const dashboard = await client.dashboard.getDashboardV2({ path: { id } });
        return raw ? dashboard : summarizeDashboard(client, dashboard);
      })
  );

  server.registerTool(
    "signoz_preview_panel",
    {
      title: "Try a dashboard panel",
      description:
        "Run one panel definition (the same shape signoz_create_dashboard takes) against the live data for a " +
        "window and answer what it would show — or SigNoz's error. Iterate here before creating the dashboard.",
      inputSchema: { panel: panelSchema, ...timeWindowShape, withPoints: z.boolean().optional() },
      annotations: READ,
    },
    async (input) =>
      run(async () => {
        const window = resolveWindow(input);
        const probe = panelProbe(input.panel);
        if (!probe) return { title: input.panel.title, note: "A text panel runs no query." };
        const step = probe.requestType === "time_series" ? stepFor(window) : undefined;
        const queries: QueryEnvelope[] = probe.promql
          ? [{ type: "promql", spec: { name: "A", query: probe.promql, step: step ?? 60 } } as QueryEnvelope]
          : envelopes(probe.queries, probe.formulas, step);
        const response = await runRange(client, rangeRequest(window, probe.requestType, queries));
        return {
          title: input.panel.title,
          window: describeWindow(window),
          requestType: probe.requestType,
          ...(formatRange(response, { withPoints: input.withPoints === true }) as object),
        };
      })
  );

  server.registerTool(
    "signoz_create_dashboard",
    {
      title: "Create a dashboard",
      description:
        "Create a SigNoz dashboard from presets and/or sections of panels, and answer its link. Presets: " +
        "api_red (requests, error rate, latency p50/p95/p99, endpoints by errors, latest failed requests — from " +
        "the service's server spans), worker_failures (job runs, failures by job, durations, error logs) and " +
        "logs_errors. Panels on traces/logs are builder queries, so clicking a point in SigNoz offers 'View " +
        "traces'/'View logs' for that interval. Every panel's query runs first (validate: 'run'); on any error " +
        "nothing is saved and the report says which panel failed and why. dryRun answers the JSON without saving. " +
        "Find service names with signoz_list_services and attributes with signoz_field_keys first.",
      inputSchema: {
        ...dashboardInputShape,
        ...validateShape,
        dryRun: z.boolean().optional().describe("Build and check, but do not save: answers the request body."),
      },
      annotations: WRITE,
    },
    async (input) =>
      run(async () => {
        const built = buildDashboard(input, context.environment);
        const window = resolveWindow({ since: input.checkWindow ?? "1h" });
        const checks = input.validate === "none" ? [] : await checkAll(client, built.panels, window);
        const failed = checks.filter((c) => !c.ok);
        const empty = checks.filter((c) => c.ok && c.hasData === false).map((c) => c.title);
        const report = {
          checkedWindow: checks.length > 0 ? describeWindow(window) : undefined,
          ...(failed.length > 0 ? { failedPanels: failed } : {}),
          ...(empty.length > 0 ? { panelsWithoutData: empty } : {}),
        };
        if (failed.length > 0) {
          return {
            saved: false,
            reason: `${failed.length} panel(s) failed their query; fix them (signoz_preview_panel helps) and try again.`,
            ...report,
          };
        }
        if (input.dryRun) return { saved: false, dryRun: true, ...report, body: built.body };
        const created = await client.dashboard.createDashboardV2({ body: built.body });
        return {
          saved: true,
          id: created.id,
          name: created.name,
          title: created.spec.display.name,
          url: dashboardUrl(client, created.id),
          panels: built.panels.map((p) => ({
            key: p.key,
            section: p.section,
            title: p.panel.title,
            kind: p.panel.kind,
          })),
          ...report,
          ...(empty.length > 0
            ? {
                note: "Panels without data in the check window may filter on a wrong service/attribute, or just be quiet.",
              }
            : {}),
        };
      })
  );

  server.registerTool(
    "signoz_update_dashboard",
    {
      title: "Extend or rebuild a dashboard",
      description:
        "Change an existing dashboard. mode 'append' (default) adds presets/sections below what is there, keeping " +
        "every existing panel; mode 'replace' rebuilds it from the input (title required). Title, description and " +
        "tags change when given. Panels are checked as in signoz_create_dashboard.",
      inputSchema: {
        id: z.string().min(1),
        mode: z.enum(["append", "replace"]).optional(),
        title: z.string().min(1).max(120).optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        presets: z.array(presetSchema).optional(),
        sections: z.array(sectionSchema).optional(),
        ...validateShape,
      },
      annotations: WRITE,
    },
    async (input) =>
      run(async () => {
        const current = await client.dashboard.getDashboardV2({ path: { id: input.id } });
        const mode = input.mode ?? "append";
        const sections: SectionInput[] = sectionsOf(input, context.environment);
        let spec: DashboardSpec;
        let added: { key: string; section: string; panel: PanelInput }[];
        if (mode === "replace") {
          if (!input.title && !current.spec.display.name) throw new ToolInputError("mode 'replace' needs a title.");
          const built = buildSections(sections);
          added = built.built;
          spec = {
            ...current.spec,
            display: {
              name: input.title ?? current.spec.display.name,
              ...((input.description ?? current.spec.display.description)
                ? { description: input.description ?? current.spec.display.description }
                : {}),
            },
            panels: built.panels,
            layouts: built.layouts,
          };
        } else {
          const built = buildSections(sections, Object.keys(current.spec.panels ?? {}));
          added = built.built;
          spec = {
            ...current.spec,
            display: {
              name: input.title ?? current.spec.display.name,
              ...((input.description ?? current.spec.display.description)
                ? { description: input.description ?? current.spec.display.description }
                : {}),
            },
            panels: { ...current.spec.panels, ...built.panels },
            layouts: [...(current.spec.layouts ?? []), ...built.layouts],
          };
        }
        const window = resolveWindow({ since: input.checkWindow ?? "1h" });
        const checks = input.validate === "none" ? [] : await checkAll(client, added, window);
        const failed = checks.filter((c) => !c.ok);
        if (failed.length > 0) {
          return { saved: false, reason: `${failed.length} panel(s) failed their query.`, failedPanels: failed };
        }
        const updated = await client.dashboard.updateDashboardV2({
          path: { id: input.id },
          body: {
            schemaVersion: DASHBOARD_SCHEMA_VERSION,
            name: current.name,
            tags: input.tags ? tagsOf(input.tags) : (current.tags ?? []).map((t) => ({ key: t.key, value: t.value })),
            spec,
          },
        });
        const empty = checks.filter((c) => c.hasData === false).map((c) => c.title);
        return {
          saved: true,
          id: updated.id,
          url: dashboardUrl(client, updated.id),
          mode,
          addedPanels: added.map((p) => ({ key: p.key, section: p.section, title: p.panel.title })),
          ...(empty.length > 0 ? { panelsWithoutData: empty } : {}),
        };
      })
  );

  server.registerTool(
    "signoz_share_dashboard",
    {
      title: "Publish a dashboard",
      description:
        "Make a dashboard viewable without login through a public link (SigNoz public dashboards). Anyone with the " +
        "link sees its data: ask the user first and pass confirm: true. Sharing inside the organization needs no " +
        "call — send the dashboard URL.",
      inputSchema: {
        id: z.string().min(1),
        defaultTimeRange: z.string().optional().describe("e.g. '1h', '24h'. Default '1h'."),
        timeRangeEnabled: z.boolean().optional().describe("Let viewers change the time range. Default true."),
        confirm: z.boolean().optional(),
      },
      annotations: { ...WRITE, destructiveHint: true },
    },
    async ({ id, defaultTimeRange, timeRangeEnabled, confirm }) =>
      run(async () => {
        if (confirm !== true) {
          throw new ToolInputError(
            "Publishing makes the dashboard public; call again with confirm: true once the user agreed."
          );
        }
        await client.dashboard.createPublicDashboard({
          path: { id },
          body: { defaultTimeRange: defaultTimeRange ?? "1h", timeRangeEnabled: timeRangeEnabled ?? true },
        });
        const config = await client.dashboard.getPublicDashboard({ path: { id } });
        return { published: true, dashboardUrl: dashboardUrl(client, id), public: config };
      })
  );
}
