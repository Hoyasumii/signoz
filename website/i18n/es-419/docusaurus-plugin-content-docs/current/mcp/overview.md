---
sidebar_position: 1
title: Sinopsis
description: "El SigNoz Servidor MCP: transportes, las herramientas curadas, el constructor de paneles y las herramientas genéricas."
---

# MCP server

`signoz-mcp` expone SigNoz a Claude Code, Codex, OpenCode o cualquier otro cliente MCP.

```bash
signoz-mcp            # stdio: what the MCP client runs
signoz-mcp --http     # http://127.0.0.1:3767/mcp (PORT changes the port)
signoz mcp start      # the same in the background; stop/status; boot enable to start it at login
```

## Herramientas

| Herramienta                                                                            | ¿Para qué?                                                                                               |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `signoz_whoami`                                                                        | Instalación, modo auth, cuenta de usuario o servicio                                                     |
| `signoz_list_services`                                                                 | Servicios con lapsos, errores, tasa de error y p95: el punto de partida para encontrar el `service.name` |
| `signoz_field_keys` / `signoz_field_values`                                            | Descubre atributos (`http.route`, `deployment.environment`, nombre de trabajo ...) y sus valores         |
| `signoz_search_logs`                                                                   | Registros por servicio, severidad, texto y filtro v5, nuevo primero                                      |
| `signoz_search_traces` / `signoz_get_trace`                                            | Ganchos por servicio, operación, error y duración; un rastro como cascada con sus excepciones            |
| `signoz_query`                                                                         | Consultas de constructores (traces, troncos, métricas) con fórmulas, o PromQL                            |
| `signoz_list_metrics` / `signoz_query_metrics`                                         | Descubre métricas y consultalas                                                                          |
| `signoz_list_alerts` / `signoz_list_rules` / `signoz_get_rule` / `signoz_rule_history` | Alertas, reglas e historia                                                                               |
| `signoz_list_dashboards` / `signoz_get_dashboard`                                      | Dashboards y sus paneles, con un enlace                                                                  |
| `signoz_preview_panel`                                                                 | Ejecuta una definición de panel sobre datos reales antes de guardar                                      |
| `signoz_create_dashboard` / `signoz_update_dashboard`                                  | Crea o extiende un panel desde presets y/o sus propios paneles                                           |
| `signoz_share_dashboard`                                                               | Hace público el panel de control (requiere `confirm: true`)                                              |
| `signoz_resources` / `signoz_describe` / `signoz_call`                                 | Las otras operaciones ~230: vistas, canales, horas de inactividad, cuentas de servicio...                |

- [Herramientas de telemetría](./telemetry-tools.md): servicios, registros, trazas, consultas y métricas.
- [Alertas](./alerts.md): alertas de disparo, reglas y su historia.
- [Dashboards](./dashboards.md): los presets, sus propios paneles y el cheque antes de guardar.
- [Herramientas genéricas](./generic-tools.md): el resto de la API REST.

## El modo HTTP

- Es apátridas y escucha `127.0.0.1` Sólo.
- Se niega a `Host` eso no es retroceso, contra la rebinación de DNS.
- `GET /health` respuestas `{ ok, baseUrl, auth, environment, version }`.
- `POST /shutdown` con la ficha `signoz mcp start` genera lo cierra; así es como `signoz mcp stop` detiene el servidor,
  Windows incluido.

En modo stdio, stdout lleva el protocolo: los registros del servidor a stderr solamente.

Los errores nunca llevan una credencial: cada error de herramienta pasa por el mismo enmascaramiento que el SDK.
