---
sidebar_position: 3
title: Telemetry tools
description: "Services, attributes, logs, traces, builder and PromQL queries, and metrics: the tools that read telemetry."
---

# Telemetry tools

## Windows and environments

Every telemetry tool takes its window as `since` (`15m`, `6h`, `7d`; default `1h`) or as `start`/`end` (ISO 8601
or epoch milliseconds; `end` defaults to now).

The tools that filter by environment add `deployment.environment = <SIGNOZ_ENV>` when a default environment is
configured. `environment` on a call picks another one, and `environment: "all"` drops the filter. `signoz_query`
is the exception: it adds the filter only when you pass `environment`.

Filters use SigNoz's v5 expression syntax: `service.name = 'point-api' AND has_error = true`.

## Find what exists first

| Tool                   | What it answers                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `signoz_list_services` | Services that sent spans in the window: spans, errors, error rate, p95. `search` narrows |
| `signoz_field_keys`    | Attribute and resource field names for a `signal` (`traces`, `logs`, `metrics`)          |
| `signoz_field_values`  | Values of one field (`name`), optionally narrowed by `search` and by `existingQuery`     |

Use them to find the exact `service.name`, the attribute that names a route or a job, and the environments.

## Logs and traces

- `signoz_search_logs`: the latest lines by `service`, `severity` (e.g. `["ERROR", "FATAL"]`), `text` (a substring of
  the body) and `filter`, newest first. Rows carry `trace_id` when the log is correlated; `withAttributes` adds
  every attribute.
- `signoz_search_traces`: the latest spans by `service`, `operation` (the span name), `errorsOnly`,
  `minDurationMs` and `filter`, newest first or slowest first (`orderBy`). `fields` adds attributes to each row.
- `signoz_get_trace`: one trace as a waterfall, with the root service, span and error counts, each span's depth,
  duration and key HTTP/DB attributes, and its exceptions.

## Queries

`signoz_query` runs builder queries over traces, logs or metrics, with formulas, or a PromQL query: the same
queries a dashboard panel runs. `requestType` picks the shape:

- `time_series` (default): each series summarized as min, max, average, last value and the time of the peak.
  `withPoints` adds up to 60 points per series; `stepSeconds` sets the bucket size.
- `scalar`: one row per group.
- `raw`: rows.

Use it to investigate a spike, and to check a query before putting it on a dashboard.

## Metrics

- `signoz_list_metrics`: metric names received in the window, with type, unit and description. With `name`, the
  metadata of that one metric (type, temporality, unit).
- `signoz_query_metrics`: one metric over time, by `metric` with `timeAggregation` (default `rate`; `avg` or
  `latest` for gauges), `spaceAggregation` (default `sum`; `p50`…`p99` for histograms), `filter` and `groupBy` —
  or `promql` instead.
