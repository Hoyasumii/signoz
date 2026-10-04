---
sidebar_position: 8
title: 程序使用
description: "运行 SigNoz MCP服务器来自您自己的代码: over stdio, over HTTP, 或者在任何 MCP 传输上."
---

# 程序使用

`@hoyasumii/signoz/mcp` 输出服务器及其传输。

## 斯特迪奥

```ts
import { serveSignozMcpStdio } from "@hoyasumii/signoz/mcp";

const mcp = await serveSignozMcpStdio({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
await mcp.closed; // settles when the client closes stdin
```

Stdout带着协议,所以没有其他东西可以写下来。 `stdin`页:1`stdout` 可以是其他溪流。

## HTTP 软件

```ts
import { startSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = await startSignozMcpServer({ port: 0, baseUrl, apiKey });
console.log(server.url); // http://127.0.0.1:<port>/mcp
await server.close();
```

`port: 0` 选择自由端口。 `shutdownToken` 启用 `POST /shutdown` (请求包含在 `X-Signoz-Shutdown`),以及 `onShutdown` 关闭服务器后运行。

都带 `apiKey` 或 `authToken` + 键 `refreshAuthToken`, (中文). `environment` (默认) `deployment.environment`和(或) `sessionFile`
(其中旋转的令牌持续存在).

## 任何运输

```ts
import { createSignozClient } from "@hoyasumii/signoz";
import { buildSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = buildSignozMcpServer(createSignozClient({ baseUrl, apiKey }), { environment: "production" });
await server.connect(transport);
```

`buildSignozMcpServer` 回答赤裸的 `McpServer`,每个工具都注册,没有附带运输工具。

## 还出口

- `resolveMcpConfig`, (中文). `clientFor`, (中文). `configFilePath`, (中文). `readEnvFile`, (中文). `writeEnvFile`: CLI 使用的配置.
- `CATALOG`, (中文). `searchCatalog`, (中文). `describeOperation`, (中文). `invoke`:通用工具运行在什么上.
- `buildDashboard`: 仪表板构建器,来自相同的输入 `signoz_create_dashboard` 带子
