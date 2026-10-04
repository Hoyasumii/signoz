---
sidebar_position: 1
title: 概述
description: "其 SigNoz MCP伺服器:運輸工具、經典工具、仪表板建造器和通用工具。"
---

# MCP 伺服器

`signoz-mcp` 曝光 SigNoz 至 Claude Code, Codex, OpenCode 或其他MCP客戶端。

```bash
signoz-mcp            # stdio: what the MCP client runs
signoz-mcp --http     # http://127.0.0.1:3767/mcp (PORT changes the port)
signoz mcp start      # the same in the background; stop/status; boot enable to start it at login
```

## 工具

| 工具                                                                                   | 為什麼                                                     |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `signoz_whoami`                                                                        | 實體、 驗證模式、 用戶或服務帳號                           |
| `signoz_list_services`                                                                 | 具有跨度、錯誤、錯誤率和p95的服務:找到 `service.name`      |
| `signoz_field_keys` / `signoz_field_values`                                            | 發現屬性( E)`http.route`, `deployment.environment`及其價值 |
| `signoz_search_logs`                                                                   | 按服務、 嚴格度、 文字與 v5 過程的紀錄,                    |
| `signoz_search_traces` / `signoz_get_trace`                                            | 按服務、操作、錯誤和時間來看,                              |
| `signoz_query`                                                                         | 用公式建立查詢器( 追蹤、 紀錄、 公尺), 或 PromQL           |
| `signoz_list_metrics` / `signoz_query_metrics`                                         | 發現測量並查詢                                             |
| `signoz_list_alerts` / `signoz_list_rules` / `signoz_get_rule` / `signoz_rule_history` | 發射警報、規矩與歷史                                       |
| `signoz_list_dashboards` / `signoz_get_dashboard`                                      | 碟片板及其面板,有連結                                      |
| `signoz_preview_panel`                                                                 | 在儲存前執行對實數據的面板定義                             |
| `signoz_create_dashboard` / `signoz_update_dashboard`                                  | 從預設和( 或) 自己的面板建立或展開一個儀表板               |
| `signoz_share_dashboard`                                                               | (要求) `confirm: true`)                                    |
| `signoz_resources` / `signoz_describe` / `signoz_call`                                 | 其他 ~230 操作: 儲存檢視, 頻道, 停機, 服務帳戶...          |

- [遥測工具](./telemetry-tools.md):服務、紀錄、追蹤、查詢和衡量。
- [警告](./alerts.md):發射警報,規則和歷史.
- [板](./dashboards.md): 預置, 自有面板和支票才保存 。
- [一般工具](./generic-tools.md)- 剩下的API

## HTTP 模式

- 無國籍,聽著 `127.0.0.1` 只有
- 它拒絕了 `Host` 而不是反轉 DNS 重新捆綁。
- `GET /health` 答案 `{ ok, baseUrl, auth, environment, version }`.
- `POST /shutdown` 與符號 `signoz mcp start` 產生關閉它; 這就是如何 `signoz mcp stop` 停止伺服器, 包括 Windows 。

在 stdio 模式下, stdout 帶有協議: 伺服器紀錄只限 stderr 。

錯誤從來不帶憑證 : 每一個工具錯誤都經過 SDK 相同的掩護 。
