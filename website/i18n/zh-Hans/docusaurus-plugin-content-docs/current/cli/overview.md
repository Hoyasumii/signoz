---
sidebar_position: 1
title: CLI 概览
description: "signoz 命令:每个 MCP 工具作为子命令,以工具的输入方案作为其旗帜."
---

# 国 际

软件包安装一个 `signoz` 命令。 这是MCP的客户端 [同一服务器](../mcp/overview.md):每个MCP工具成为子命令,工具的输入方案成为其旗帜. 默认情况下,服务器运行在命令内,所以没有任何东西可以先启动.

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

没什么,只是... `--help`, (中文). `--version`, (中文). `signoz docs`, (中文). `signoz mcp config` 和 `signoz mcp uninstall` 运行,直到保存有
URL 和证书的配置。 `signoz docs` 打印此网站的链接,并在浏览器中打开。

## 从工具到命令

- 命令是工具的名称, 不包含 `signoz_`,以kebab为例: `signoz_search_logs` → `search-logs`。 。 。 。
- 每个旗帜是 kebab- case 中的输入: `traceId` → `--trace-id`, (中文). `errorsOnly` → `--errors-only`。 。 。 。
- 显示阵列旗 `a,b` 或JSON,对象旗取JSON,布尔旗不需要值.
- `signoz <command> --help` 列出命令的旗帜,并列出允许的enum输入值。

工具输出到 stdout 。 工具错误以退出码 1 进入 stderr 。

## 一次性设置和运行中的服务器

`--base-url`, (中文). `--api-key` 和 `--env` 覆盖环境和保存的文件 。 用一个 `signoz-mcp` 已经运行在 HTTP 上,通过
`--url http://127.0.0.1:3767/mcp` 或设置 `SIGNOZ_MCP_URL`这些旗帜在命令线上任何地方都有作用。

其中没有一个代表保存的配置: CLI 拒绝在没有它的情况下运行工具, 即使当 `--url` 或 `--api-key` 给出。

## 管理服务器

`signoz mcp` 在连接之前被截获。 它配置服务器,在背景中运行,在登录时启动,并在您的MCP客户端中注册. 见 [`signoz mcp`](./mcp-commands.md)。 。 。 。
