---
sidebar_position: 1
title: Übersicht
description: "Die SigNoz MCP-Server: Transporte, die kuratierten Tools, der Dashboard Builder und die generischen Tools."
---

# MCP-Server

`signoz-mcp` exponiert SigNoz bis Claude Code, Codex, OpenCode oder einem anderen MCP-Client.

```bash
signoz-mcp            # stdio: what the MCP client runs
signoz-mcp --http     # http://127.0.0.1:3767/mcp (PORT changes the port)
signoz mcp start      # the same in the background; stop/status; boot enable to start it at login
```

## Werkzeuge

| Werkzeug                                                                               | Was ist                                                                                         |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `signoz_whoami`                                                                        | Instanz, Auth-Modus, Benutzer- oder Dienstkonto                                                 |
| `signoz_list_services`                                                                 | Dienste mit Spannweiten, Fehlern, Fehlerquote und p95: der Ausgangspunkt, um die `service.name` |
| `signoz_field_keys` / `signoz_field_values`                                            | Attribute entdecken ()`http.route`, `deployment.environment`, Jobname ... und ihre Werte        |
| `signoz_search_logs`                                                                   | Logs nach Service, Strenge, Text und v5-Filter, neueste zuerst                                  |
| `signoz_search_traces` / `signoz_get_trace`                                            | Spans nach Service, Betrieb, Fehler und Dauer; eine Spur als Wasserfall mit seinen Ausnahmen    |
| `signoz_query`                                                                         | Builder-Abfragen (Spuren, Protokolle, Metriken) mit Formeln oder PromQL                         |
| `signoz_list_metrics` / `signoz_query_metrics`                                         | Kennzahlen entdecken und abfragen                                                               |
| `signoz_list_alerts` / `signoz_list_rules` / `signoz_get_rule` / `signoz_rule_history` | Abfeuern von Warnungen, Regeln und Geschichte                                                   |
| `signoz_list_dashboards` / `signoz_get_dashboard`                                      | Dashboards und ihre Panels, mit einem Link                                                      |
| `signoz_preview_panel`                                                                 | Führt eine Paneldefinition für reale Daten aus, bevor Sie speichern                             |
| `signoz_create_dashboard` / `signoz_update_dashboard`                                  | Erstellt oder erweitert ein Dashboard aus Presets und/oder eigenen Panels                       |
| `signoz_share_dashboard`                                                               | Macht das Dashboard öffentlich (erfordert) `confirm: true`)                                     |
| `signoz_resources` / `signoz_describe` / `signoz_call`                                 | Die anderen ~230 Operationen: gespeicherte Ansichten, Kanäle, Ausfallzeiten, Servicekonten ...  |

- [Telemetriewerkzeuge](./telemetry-tools.md): Dienste, Protokolle, Traces, Abfragen und Metriken.
- [Warnungen](./alerts.md): Abfeuern von Alarmen, Regeln und ihrer Geschichte.
- [Dashboards](./dashboards.md): die Presets, Ihre eigenen Panels und der Check vor dem Speichern.
- [Generische Werkzeuge](./generic-tools.md)Der Rest der REST API.

## Der HTTP-Modus

- Es ist staatenlos und hört zu `127.0.0.1` nur.
- Sie lehnt eine `Host` Das ist kein Loopback, gegen DNS-Rebinding.
- `GET /health` Antworten `{ ok, baseUrl, auth, environment, version }`.
- `POST /shutdown` Mit dem Token `signoz mcp start` Er erzeugt es; so ist es `signoz mcp stop` Stoppt den Server,
  Windows eingeschlossen.

Im Stdio-Modus trägt stdout das Protokoll: Der Server loggt sich nur bei stderr an.

Fehler tragen nie einen Nachweis: Jeder Tool-Fehler durchläuft die gleiche Maskierung wie das SDK.
