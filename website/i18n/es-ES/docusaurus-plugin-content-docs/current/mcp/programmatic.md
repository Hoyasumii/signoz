---
sidebar_position: 8
title: Uso programático
description: "Corre. SigNoz servidor MCP desde su propio código: sobre stdio, sobre HTTP, o en cualquier transporte MCP."
---

# Uso programático

`@hoyasumii/signoz/mcp` exporta el servidor y sus transportes.

## Stdio

```ts
import { serveSignozMcpStdio } from "@hoyasumii/signoz/mcp";

const mcp = await serveSignozMcpStdio({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
await mcp.closed; // settles when the client closes stdin
```

stdout lleva el protocolo, así que nada más puede escribirle. `stdin`/`stdout` pueden ser otras corrientes.

## HTTP

```ts
import { startSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = await startSignozMcpServer({ port: 0, baseUrl, apiKey });
console.log(server.url); // http://127.0.0.1:<port>/mcp
await server.close();
```

`port: 0` elige un puerto libre. `shutdownToken` habilitación `POST /shutdown` (la solicitud la lleva en
`X-Signoz-Shutdown`), y `onShutdown` se ejecuta después de que cerró el servidor.

Ambos toman `apiKey` o `authToken` + `refreshAuthToken`, `environment` (el defecto `deployment.environment`) y
`sessionFile` (donde persisten las fichas rotativas).

## Cualquier transporte

```ts
import { createSignozClient } from "@hoyasumii/signoz";
import { buildSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = buildSignozMcpServer(createSignozClient({ baseUrl, apiKey }), { environment: "production" });
await server.connect(transport);
```

`buildSignozMcpServer` responde al desnudo `McpServer`, con cada herramienta registrada y sin transporte adjunto.

## También exportado

- `resolveMcpConfig`, `clientFor`, `configFilePath`, `readEnvFile`, `writeEnvFile`: la configuración que utiliza el CLI.
- `CATALOG`, `searchCatalog`, `describeOperation`, `invoke`: lo que las herramientas genéricas funcionan.
- `buildDashboard`: el constructor de paneles, de la misma entrada `signoz_create_dashboard` Toma.
