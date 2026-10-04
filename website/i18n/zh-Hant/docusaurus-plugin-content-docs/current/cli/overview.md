---
sidebar_position: 1
title: CLI 概述
description: "signoz 命令: 每個 MCP 工具作為子命令, 以工具的輸入方案為旗號 。"
---

# 中央LI

套件安裝 a `signoz` 命令。 這是MCP的客戶端 [同樣的伺服器](../mcp/overview.md): 每一個 MCP 工具都成為子命令, 工具的輸入方案成為它的旗號 。 假設伺服器在命令內執行, 所以沒有什麼可以先開始的
。

```bash
npx signoz mcp config                          # once: the instance URL and an API key (or the browser tokens)
npx signoz tools                               # every command, one per MCP tool
npx signoz whoami
npx signoz list-services --since 24h
npx signoz search-logs --service point-api --severity ERROR,FATAL --since 30m
npx signoz search-traces --service point-api --errors-only --min-duration-ms 500
npx signoz get-trace --trace-id 4bf92f3577b34da6a3ce929d0e0e4736
npx signoz resources --query "saved view"
npx signoz call --operation rules.listRules
```

除了... `--help`, `--version`, `signoz docs`, `signoz mcp config` 和 `signoz mcp uninstall` 執行到有 URL 和憑證的配置被儲存 。
`signoz docs` 打印此網站的連結并在瀏覽器中開啟它。

## 從工具到命令

- 此命令是工具的名稱, 不包含 `signoz_`,以kebab案: `signoz_search_logs` → `search-logs`.
- 每一面旗都是 kebab 案的輸入 : `traceId` → `--trace-id`, `errorsOnly` → `--errors-only`.
- 列旗取 `a,b` 或 JSON, 物件旗帶 JSON, 而布林旗不需要值 。
- `signoz <command> --help` 列出命令的旗號, 并列出 enum 輸入的允許值 。

工具輸出到 stdout 。 工具錯誤會以退出碼 1 傳到 stderr 。

## 一次性設定和執行中的伺服器

`--base-url`, `--api-key` 和 `--env` 覆蓋環境與儲存的檔案, 供執行中伺服器使用 。 使用 `signoz-mcp` 已經在 HTTP 之上了, 通過
`--url http://127.0.0.1:3767/mcp` 或設定 `SIGNOZ_MCP_URL`這些旗子在命令線上任何地方都行

他們中沒有一個人支持儲存的設定: CLI 拒絕沒有它而執行工具, 即使當 `--url` 或 `--api-key` 提供。

## 管理伺服器

`signoz mcp` 在任何連接之前被截取 。 它會設定伺服器, 在背景中執行, 從登入開始, 并在您的 MCP 客戶端中登入 。 看 [`signoz mcp`](./mcp-commands.md).
