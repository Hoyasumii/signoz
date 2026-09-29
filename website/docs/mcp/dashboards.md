---
sidebar_position: 5
title: Dashboards
description: "Build SigNoz dashboards from presets and your own panels, checked against SigNoz before anything is saved."
---

# Dashboards

`signoz_create_dashboard` builds a dashboard in SigNoz's v2 format (Perses, `schemaVersion: "v6"`) on a 12-column
grid, and answers its `url`.

## Presets

- `api_red`: requests, error rate, p50/p95/p99 latency, requests by status, the endpoints that fail the most and
  the latest failed requests. Built from the service's entry spans (`kind_string = 'Server'`, adjustable in
  `filter`); `routeAttribute` names the endpoint (default `http.route`).
- `worker_failures`: runs and failures per job, p95 duration, a per-job table, the latest failures and error
  logs. `filter` picks the spans that are jobs (e.g. `name LIKE 'job.%'`), and `jobAttribute` the attribute that
  names them (default the span name).
- `logs_errors`: ERROR/FATAL by severity and the latest lines.

Each preset takes a `service`, and optionally an `environment` and a `title`.

## Your own panels

`sections` holds your own sections (a collapsible row each, with a `title`) of `panels`:

| Field                  | What for                                                        |
| ---------------------- | --------------------------------------------------------------- |
| `title`, `description` | The panel's header                                              |
| `kind`                 | `timeseries`, `bar`, `number`, `table`, `pie`, `list` or `text` |
| `queries`, `formulas`  | Builder queries (A, B, …) and formulas such as `A / B * 100`    |
| `promql`               | A PromQL query instead of builder queries                       |
| `text`                 | Markdown, for a `text` panel                                    |
| `unit`                 | `ns`, `ms`, `s`, `percent`, `reqps`, `short`, `bytes`…          |
| `thresholds`           | Lines (timeseries/bar) or colour rules (number)                 |
| `width`, `height`      | Columns out of 12, and rows                                     |

Several queries, or any formula, make one composite query per panel. `list` panels take one builder query with no
aggregation, and show raw log lines or spans.

Try a panel first with `signoz_preview_panel`: it runs the same definition against live data and answers what the
panel would show, or SigNoz's error.

## The check before saving

Before saving, every panel runs its query on SigNoz (`validate: "run"`, over `checkWindow`, default `1h`). If a
panel fails, nothing is saved, and the answer says which panel failed with SigNoz's own message. Panels with no
data in the check window are listed too. `dryRun: true` answers the JSON without saving.

Trace and log panels are builder queries, so SigNoz offers **View traces / View logs** when you click a point on
the chart, over the same interval.

## Example

```bash
signoz list-services --since 24h --search point
signoz create-dashboard --title "Point — API and workers (production)" --tags team:point \
  --presets '[{"preset":"api_red","service":"point-api"},{"preset":"worker_failures","service":"point-worker"},{"preset":"logs_errors","service":"point-api"}]'
```

## Changing and sharing

- `signoz_update_dashboard` with `mode: "append"` (default) adds presets and sections below the existing panels;
  `mode: "replace"` rebuilds the dashboard from the input. Panels are checked the same way.
- `signoz_list_dashboards` and `signoz_get_dashboard` read them back (`raw: true` for the full JSON).
- `signoz_share_dashboard` makes a dashboard viewable without login through a public link. Anyone with the link
  sees its data, so it needs `confirm: true`. Sharing inside the organization needs no call: send the dashboard's
  URL.
