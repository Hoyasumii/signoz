---
sidebar_position: 1
title: Visão geral
description: "A SigNoz Servidor MCP: transportes, ferramentas com curadoria, construtor de painéis e ferramentas genéricas."
---

# Servidor MCP

`signoz-mcp` expõe SigNoz para Claude Code, Codex, OpenCode ou qualquer outro cliente MCP.

```bash
signoz-mcp            # stdio: what the MCP client runs
signoz-mcp --http     # http://127.0.0.1:3767/mcp (PORT changes the port)
signoz mcp start      # the same in the background; stop/status; boot enable to start it at login
```

## Ferramentas

| Ferramenta                                                                             | Para quê?                                                                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `signoz_whoami`                                                                        | Instância, modo de autenticação, usuário ou conta de serviço                                      |
| `signoz_list_services`                                                                 | Serviços com spans, erros, taxa de erro e p95: o ponto de partida para encontrar o `service.name` |
| `signoz_field_keys` / `signoz_field_values`                                            | Descobrir atributos (`http.route`, `deployment.environment`, nome do trabalho...) e seus valores  |
| `signoz_search_logs`                                                                   | Registros por serviço, gravidade, texto e filtro v5, mais novo primeiro                           |
| `signoz_search_traces` / `signoz_get_trace`                                            | Spans por serviço, operação, erro e duração; um traço como cachoeira com suas exceções            |
| `signoz_query`                                                                         | Consultas do construtor (traços, logs, métricas) com fórmulas, ou PromQL                          |
| `signoz_list_metrics` / `signoz_query_metrics`                                         | Descubra métricas e consulte-as                                                                   |
| `signoz_list_alerts` / `signoz_list_rules` / `signoz_get_rule` / `signoz_rule_history` | Alertas de disparo, regras e história                                                             |
| `signoz_list_dashboards` / `signoz_get_dashboard`                                      | Painéis e seus painéis, com ligação                                                               |
| `signoz_preview_panel`                                                                 | Executa uma definição de painel sobre dados reais antes de salvar                                 |
| `signoz_create_dashboard` / `signoz_update_dashboard`                                  | Cria ou amplia um painel a partir de predefinições e/ou seus próprios painéis                     |
| `signoz_share_dashboard`                                                               | Torna o painel público (requisitos `confirm: true`)                                               |
| `signoz_resources` / `signoz_describe` / `signoz_call`                                 | As outras operações ~230: vistas salvas, canais, tempos de inatividade, contas de serviço...      |

- [Ferramentas de telemetria](./telemetry-tools.md): serviços, logs, traços, consultas e métricas.
- [Alertas](./alerts.md): alertas de disparo, regras e sua história.
- [Painéis](./dashboards.md): as predefinições, seus próprios painéis e a verificação antes de salvar.
- [Ferramentas genéricas](./generic-tools.md): o resto da API REST.

## O modo HTTP

- É apátrida e escuta `127.0.0.1` Apenas.
- Recusa-se a `Host` que não é loopback, contra a religação DNS.
- `GET /health` respostas `{ ok, baseUrl, auth, environment, version }`.
- `POST /shutdown` com o símbolo `signoz mcp start` gera fecha; é assim que `signoz mcp stop` pára o servidor, incluindo
  o Windows.

No modo stdio, o stdout carrega o protocolo: o servidor registra somente o stderr.

Erros nunca carregam uma credencial: cada erro de ferramenta passa pelo mesmo mascaramento do SDK.
