---
sidebar_position: 1
title: Overview
description: "The SigNoz MCP server: transports, the curated tools, the dashboard builder and the generic tools."
---

# MCP server

`signoz-mcp` exposes SigNoz to Claude Code, Codex, OpenCode or any other MCP client.

```bash
signoz-mcp            # stdio: what the MCP client runs
signoz-mcp --http     # http://127.0.0.1:3767/mcp (PORT changes the port)
signoz mcp start      # the same in the background; stop/status; boot enable to start it at login
```

## Tools

| Tool                                                                                   | What for                                                                                       |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `signoz_whoami`                                                                        | Instance, auth mode, user or service account                                                   |
| `signoz_list_services`                                                                 | Services with spans, errors, error rate and p95: the starting point to find the `service.name` |
| `signoz_field_keys` / `signoz_field_values`                                            | Discover attributes (`http.route`, `deployment.environment`, job name…) and their values       |
| `signoz_search_logs`                                                                   | Logs by service, severity, text and v5 filter, newest first                                    |
| `signoz_search_traces` / `signoz_get_trace`                                            | Spans by service, operation, error and duration; a trace as a waterfall with its exceptions    |
| `signoz_query`                                                                         | Builder queries (traces, logs, metrics) with formulas, or PromQL                               |
| `signoz_list_metrics` / `signoz_query_metrics`                                         | Discover metrics and query them                                                                |
| `signoz_list_alerts` / `signoz_list_rules` / `signoz_get_rule` / `signoz_rule_history` | Firing alerts, rules and history                                                               |
| `signoz_list_dashboards` / `signoz_get_dashboard`                                      | Dashboards and their panels, with a link                                                       |
| `signoz_preview_panel`                                                                 | Runs a panel definition on real data before saving                                             |
| `signoz_create_dashboard` / `signoz_update_dashboard`                                  | Creates or extends a dashboard from presets and/or your own panels                             |
| `signoz_share_dashboard`                                                               | Makes the dashboard public (requires `confirm: true`)                                          |
| `signoz_resources` / `signoz_describe` / `signoz_call`                                 | The other ~230 operations: saved views, channels, downtimes, service accounts…                 |

- [Telemetry tools](./telemetry-tools.md): services, logs, traces, queries and metrics.
- [Alerts](./alerts.md): firing alerts, rules and their history.
- [Dashboards](./dashboards.md): the presets, your own panels and the check before saving.
- [Generic tools](./generic-tools.md): the rest of the REST API.

## The HTTP mode

- It is stateless and listens on `127.0.0.1` only.
- It refuses a `Host` that is not loopback, against DNS rebinding.
- `GET /health` answers `{ ok, baseUrl, auth, environment, version }`.
- `POST /shutdown` with the token `signoz mcp start` generates closes it; that is how `signoz mcp stop` stops the
  server, Windows included.

In stdio mode, stdout carries the protocol: the server logs to stderr only.

Errors never carry a credential: every tool error goes through the same masking as the SDK's.
