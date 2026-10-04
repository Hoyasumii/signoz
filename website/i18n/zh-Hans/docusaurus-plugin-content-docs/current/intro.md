---
sidebar_position: 1
title: 开始
description: "页:1 TypeScript SDK为 SigNoz API,有一个MCP服务器和一个CLI建在它上:每个部分做什么以及如何安装."
slug: /intro
---

# 开始

`@hoyasumii/signoz` 是一个 TypeScript SDK为 [SigNoz](https://signoz.io) REST API,有一个MCP服务器和一个CLI在其上方建造. 用从代码,从AI代理,或从您的终端:
三个都共享同一个客户端.

- **SDK 软件**:该官员的241项业务 SigNoz v0.142.1 spec, 每盘打法 `operationId`它以服务账户 API 键或浏览器会话的符号认证,并为您旋转它们。 开始于
  [SDK 软件](./sdk/overview.md)。 。 。 。
- **MCP 服务器** (单位:千美元)`@hoyasumii/signoz/mcp`边 `signoz-mcp`: stdio 或可流式 HTTP 打开 `127.0.0.1`.
  用于服务、日志、跟踪、度量和警报的破解工具,一个仪表板制造器,对照每个面板检查 SigNoz 在保存之前,以及API其他部分的通用工具。 开始于 [MCP 服务器](./mcp/overview.md)。 。 。 。
- **国 际** (单位:千美元)`signoz`: 每个 MCP 工具作为子命令,加 `signoz mcp` 配置服务器, 在背景中运行, 在登录时启动并注册到 Claude Code, (中文). Codex 和
  OpenCode开始于 [国 际](./cli/overview.md)。 。 。 。

这是一个独立的, **非正式** 项目,不隶属于 SigNoz 联合国

## 安装

要求 Node.js 20岁或以后。

```bash
npm i -g @hoyasumii/signoz     # or: pnpm add -g @hoyasumii/signoz
signoz mcp config              # the instance URL and an API key (or the browser tokens), saved per user
signoz mcp install             # registers the server (stdio) in Claude Code / Codex / OpenCode
```

作为图书馆, `npm install @hoyasumii/signoz`。 。 。 。

## 版本

软件包有自己的版本; 每个发行镜像一个 SigNoz API版本. 用一个符合你实例的 `signoz whoami` 显示为 `sdkSignozVersion`,SDK则将其导出为 `SIGNOZ_API_VERSION`。 。 。 。

| `@hoyasumii/signoz` | SigNoz API 密码 |
| ------------------- | --------------- |
| 0.1.x               | v0.142.1        |

## 第一通电话

```ts
import { createSignozClient } from "@hoyasumii/signoz";

const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
const me = await signoz.users.getMyUser();
```

从终点站,一次 `signoz mcp config` 已保存配置 :

```bash
signoz whoami
signoz list-services --since 24h
```

`signoz docs` 打开此网站。
