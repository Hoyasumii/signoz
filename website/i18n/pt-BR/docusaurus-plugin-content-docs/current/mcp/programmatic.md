---
sidebar_position: 8
title: Uso programático
description: "Rode o servidor MCP do SigNoz no seu próprio código: por stdio, por HTTP ou em qualquer transporte MCP."
---

# Uso programático

`@hoyasumii/signoz/mcp` exporta o servidor e seus transportes.

## Stdio

```ts
import { serveSignozMcpStdio } from "@hoyasumii/signoz/mcp";

const mcp = await serveSignozMcpStdio({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
await mcp.closed; // resolve quando o cliente fecha o stdin
```

O stdout carrega o protocolo, então nada mais pode escrever nele. `stdin`/`stdout` podem ser outros streams.

## HTTP

```ts
import { startSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = await startSignozMcpServer({ port: 0, baseUrl, apiKey });
console.log(server.url); // http://127.0.0.1:<porta>/mcp
await server.close();
```

`port: 0` escolhe uma porta livre. `shutdownToken` habilita `POST /shutdown` (a requisição o leva em
`X-Signoz-Shutdown`), e `onShutdown` roda depois que ele fechou o servidor.

Os dois recebem `apiKey` ou `authToken` + `refreshAuthToken`, `environment` (o `deployment.environment` padrão) e
`sessionFile` (onde os tokens rotacionados persistem).

## Qualquer transporte

```ts
import { createSignozClient } from "@hoyasumii/signoz";
import { buildSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = buildSignozMcpServer(createSignozClient({ baseUrl, apiKey }), { environment: "production" });
await server.connect(transport);
```

`buildSignozMcpServer` devolve o `McpServer` puro, com todas as ferramentas registradas e nenhum transporte.

## Também exportados

- `resolveMcpConfig`, `clientFor`, `configFilePath`, `readEnvFile`, `writeEnvFile`: a configuração que a CLI usa.
- `CATALOG`, `searchCatalog`, `describeOperation`, `invoke`: o que as ferramentas genéricas usam.
- `buildDashboard`: o construtor de dashboards, com a mesma entrada de `signoz_create_dashboard`.
