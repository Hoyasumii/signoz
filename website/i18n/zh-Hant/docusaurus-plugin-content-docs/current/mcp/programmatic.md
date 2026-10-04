---
sidebar_position: 8
title: 程序使用
description: "執行 SigNoz MCP 伺服器來自您的代碼: 超過 stdio, 超過 HTTP, 或是任何 MCP 傳輸 。"
---

# 程序使用

`@hoyasumii/signoz/mcp` 匯出伺服器及其傳輸。

## 斯迪奧

```ts
import { serveSignozMcpStdio } from "@hoyasumii/signoz/mcp";

const mcp = await serveSignozMcpStdio({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
await mcp.closed; // settles when the client closes stdin
```

Stdout帶了條件 所以沒有別的字可以寫 `stdin`/`stdout` 可以是其他溪流。

## (HTTP)

```ts
import { startSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = await startSignozMcpServer({ port: 0, baseUrl, apiKey });
console.log(server.url); // http://127.0.0.1:<port>/mcp
await server.close();
```

`port: 0` 選擇自由端口 。 `shutdownToken` 啟動 `POST /shutdown` (要求中包含) `X-Signoz-Shutdown`),和 `onShutdown` 在它關閉伺服器後執行 。

都拿 `apiKey` 或 `authToken` + `refreshAuthToken`, `environment` (缺省) `deployment.environment`和 `sessionFile` (其中旋轉的符號持續).

## 任何交通工具

```ts
import { createSignozClient } from "@hoyasumii/signoz";
import { buildSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = buildSignozMcpServer(createSignozClient({ baseUrl, apiKey }), { environment: "production" });
await server.connect(transport);
```

`buildSignozMcpServer` 回答赤裸的 `McpServer`,所有工具都已登記,而且沒有接觸。

## 也匯出

- `resolveMcpConfig`, `clientFor`, `configFilePath`, `readEnvFile`, `writeEnvFile`: CLI 使用的配置 。
- `CATALOG`, `searchCatalog`, `describeOperation`, `invoke`: 通用工具的運作。
- `buildDashboard`: 同樣輸入的儀表板建立器 `signoz_create_dashboard` 收
