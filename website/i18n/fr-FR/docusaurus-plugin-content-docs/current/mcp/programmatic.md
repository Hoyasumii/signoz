---
sidebar_position: 8
title: Utilisation programmatique
description: "Exécutez SigNoz Serveur MCP à partir de votre propre code : sur stdio, sur HTTP ou sur tout transport MCP."
---

# Utilisation programmatique

`@hoyasumii/signoz/mcp` exporte le serveur et ses transports.

## Stdio

```ts
import { serveSignozMcpStdio } from "@hoyasumii/signoz/mcp";

const mcp = await serveSignozMcpStdio({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
await mcp.closed; // settles when the client closes stdin
```

stdout porte le protocole, donc rien d'autre ne peut lui écrire. `stdin`/`stdout` peut être d'autres flux.

## HTTP

```ts
import { startSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = await startSignozMcpServer({ port: 0, baseUrl, apiKey });
console.log(server.url); // http://127.0.0.1:<port>/mcp
await server.close();
```

`port: 0` Il choisit un port libre. `shutdownToken` permet `POST /shutdown` (la demande l'emporte `X-Signoz-Shutdown`),
et `onShutdown` fonctionne après avoir fermé le serveur.

Les deux prennent `apiKey` ou `authToken` + `refreshAuthToken`, `environment` (par défaut `deployment.environment`) et
`sessionFile` (les jetons tournants persistent).

## Tout transport

```ts
import { createSignozClient } from "@hoyasumii/signoz";
import { buildSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = buildSignozMcpServer(createSignozClient({ baseUrl, apiKey }), { environment: "production" });
await server.connect(transport);
```

`buildSignozMcpServer` répond à la nu `McpServer`, avec chaque outil enregistré et aucun transport attaché.

## Exportations

- `resolveMcpConfig`, `clientFor`, `configFilePath`, `readEnvFile`, `writeEnvFile`: la configuration utilisée par le
  CLI.
- `CATALOG`, `searchCatalog`, `describeOperation`, `invoke`: ce que les outils génériques fonctionnent.
- `buildDashboard`: le constructeur du tableau de bord, à partir de la même entrée `signoz_create_dashboard` Ça prend.
