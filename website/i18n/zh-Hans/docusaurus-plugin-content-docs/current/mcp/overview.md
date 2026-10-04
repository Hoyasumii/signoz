---
sidebar_position: 1
title: 概览
description: "那个 SigNoz MCP服务器:运输,编译工具,仪表板制造器和通用工具."
---

# MCP 服务器

`signoz-mcp` 曝光情况 SigNoz 改为 Claude Code, (中文). Codex, (中文). OpenCode 或任何其他MCP客户端。

```bash
signoz-mcp            # stdio: what the MCP client runs
signoz-mcp --http     # http://127.0.0.1:3767/mcp (PORT changes the port)
signoz mcp start      # the same in the background; stop/status; boot enable to start it at login
```

## 工具

| 工具                                                                                   | 为什么                                                             |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `signoz_whoami`                                                                        | 实例、 认证模式、 用户或服务账户                                   |
| `signoz_list_services`                                                                 | 具有跨度、误差、误差率和p95的服务:找到 `service.name`              |
| `signoz_field_keys` / `signoz_field_values`                                            | 发现属性( E)`http.route`, (中文). `deployment.environment`及其价值 |
| `signoz_search_logs`                                                                   | 按服务、严重程度、文本和v5过滤器分列的日志,第一                    |
| `signoz_search_traces` / `signoz_get_trace`                                            | 按服务、操作、误差和持续时间分列;作为瀑布的痕迹,但有例外           |
| `signoz_query`                                                                         | 配有公式的构建者查询(追踪、日志、度量),或 PromQL                   |
| `signoz_list_metrics` / `signoz_query_metrics`                                         | 发现参数并查询                                                     |
| `signoz_list_alerts` / `signoz_list_rules` / `signoz_get_rule` / `signoz_rule_history` | 发射警报、规则和历史                                               |
| `signoz_list_dashboards` / `signoz_get_dashboard`                                      | 挂板及其面板,带链接                                                |
| `signoz_preview_panel`                                                                 | 在保存前运行真实数据的面板定义                                     |
| `signoz_create_dashboard` / `signoz_update_dashboard`                                  | 从预设和/或您自己的面板创建或扩展一个仪表板                        |
| `signoz_share_dashboard`                                                               | 公布仪表板(要求) `confirm: true`页:1                               |
| `signoz_resources` / `signoz_describe` / `signoz_call`                                 | 其他~230操作:保存视图,频道,停机时间,服务账户.                      |

- [遥测工具](./telemetry-tools.md):服务、日志、跟踪、查询和衡量标准。
- [警报](./alerts.md):发射警报,规则及其历史.
- [电线板](./dashboards.md): 预设,你自己的面板和保存前的支票.
- [通用工具](./generic-tools.md):其余的REST API.

## HTTP 模式

- 这是无国籍的,听 `127.0.0.1` 仅此而已。
- 它拒绝一个 `Host` 这不是回转,与 DNS 重新绑定。
- `GET /health` 回复 `{ ok, baseUrl, auth, environment, version }`。 。 。 。
- `POST /shutdown` 带标志 `signoz mcp start` 生成关闭它;这就是如何 `signoz mcp stop` 停止服务器,包括Windows。

在stdio模式下,stdout携带协议:服务器日志仅用于stderr.

错误从不携带证书:每个工具错误都经过与SDK相同的面具.
