---
sidebar_position: 1
title: Visão geral
description: "O servidor MCP do SigNoz: transportes, as ferramentas curadas, o construtor de dashboards e as ferramentas genéricas."
---

# Servidor MCP

`signoz-mcp` expõe o SigNoz ao Claude Code, ao Codex, ao OpenCode ou a qualquer outro cliente MCP.

```bash
signoz-mcp            # stdio: o que o cliente MCP executa
signoz-mcp --http     # http://127.0.0.1:3767/mcp (PORT muda a porta)
signoz mcp start      # o mesmo em segundo plano; stop/status; boot enable para iniciar no login
```

## Ferramentas

| Ferramenta                                                                             | Para quê                                                                                      |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `signoz_whoami`                                                                        | Instância, modo de autenticação, usuário ou service account                                   |
| `signoz_list_services`                                                                 | Serviços com spans, erros, taxa de erro e p95: o ponto de partida para achar o `service.name` |
| `signoz_field_keys` / `signoz_field_values`                                            | Descobrir atributos (`http.route`, `deployment.environment`, nome do job…) e seus valores     |
| `signoz_search_logs`                                                                   | Logs por serviço, severidade, texto e filtro v5, mais recentes primeiro                       |
| `signoz_search_traces` / `signoz_get_trace`                                            | Spans por serviço, operação, erro e duração; um trace em cascata com suas exceções            |
| `signoz_query`                                                                         | Queries do builder (traces, logs, métricas) com fórmulas, ou PromQL                           |
| `signoz_list_metrics` / `signoz_query_metrics`                                         | Descobrir métricas e consultá-las                                                             |
| `signoz_list_alerts` / `signoz_list_rules` / `signoz_get_rule` / `signoz_rule_history` | Alertas disparados, regras e histórico                                                        |
| `signoz_list_dashboards` / `signoz_get_dashboard`                                      | Dashboards e seus painéis, com um link                                                        |
| `signoz_preview_panel`                                                                 | Roda a definição de um painel em dados reais antes de salvar                                  |
| `signoz_create_dashboard` / `signoz_update_dashboard`                                  | Cria ou estende um dashboard a partir de presets e/ou painéis seus                            |
| `signoz_share_dashboard`                                                               | Torna o dashboard público (exige `confirm: true`)                                             |
| `signoz_resources` / `signoz_describe` / `signoz_call`                                 | As outras ~230 operações: saved views, canais, downtimes, service accounts…                   |

- [Ferramentas de telemetria](./telemetry-tools.md): serviços, logs, traces, queries e métricas.
- [Alertas](./alerts.md): alertas disparados, regras e seu histórico.
- [Dashboards](./dashboards.md): os presets, seus próprios painéis e a conferência antes de salvar.
- [Ferramentas genéricas](./generic-tools.md): o resto da API REST.

## O modo HTTP

- É stateless e escuta só em `127.0.0.1`.
- Recusa um `Host` que não seja loopback, contra DNS rebinding.
- `GET /health` responde `{ ok, baseUrl, auth, environment, version }`.
- `POST /shutdown` com o token que `signoz mcp start` gera o encerra; é assim que `signoz mcp stop` para o servidor,
  inclusive no Windows.

No modo stdio, o stdout carrega o protocolo: o servidor loga só no stderr.

Erros nunca trazem uma credencial: todo erro de ferramenta passa pelo mesmo mascaramento do SDK.
