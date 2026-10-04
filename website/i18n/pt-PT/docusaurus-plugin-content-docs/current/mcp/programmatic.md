---
sidebar_position: 8
title: Uso programático
description: "Executar o SigNoz Servidor MCP a partir do seu próprio código: sobre stdio, sobre HTTP ou em qualquer transporte MCP."
---

# Uso programático

`@hoyasumii/signoz/mcp` exporta o servidor e os seus transportes.

## Stdio

```ts
import { serveSignozMcpStdio } from "@hoyasumii/signoz/mcp";

const mcp = await serveSignozMcpStdio({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
await mcp.closed; // settles when the client closes stdin
```

stdout carrega o protocolo, então nada mais pode escrever para ele. `stdin`/`stdout` podem ser outras correntes.

## HTTP

```ts
import { startSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = await startSignozMcpServer({ port: 0, baseUrl, apiKey });
console.log(server.url); // http://127.0.0.1:<port>/mcp
await server.close();
```

`port: 0` Escolhe um porto livre. `shutdownToken` habilita `POST /shutdown` (o pedido é apresentado em
`X-Signoz-Shutdown`), e `onShutdown` corre depois de fechar o servidor.

Ambos tomar `apiKey` ou `authToken` + `refreshAuthToken`, `environment` (o padrão `deployment.environment`) e
`sessionFile` (onde os símbolos girados persistem).

## Qualquer transporte

```ts
import { createSignozClient } from "@hoyasumii/signoz";
import { buildSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = buildSignozMcpServer(createSignozClient({ baseUrl, apiKey }), { environment: "production" });
await server.connect(transport);
```

`buildSignozMcpServer` responde ao nu `McpServer`, com cada ferramenta registrada e nenhum transporte anexado.

## Também exportado

- `resolveMcpConfig`, `clientFor`, `configFilePath`, `readEnvFile`, `writeEnvFile`: a configuração que o CLI usa.
- `CATALOG`, `searchCatalog`, `describeOperation`, `invoke`: o que as ferramentas genéricas executam.
- `buildDashboard`: o construtor do painel, da mesma entrada `signoz_create_dashboard` Toma.
