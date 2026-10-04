---
sidebar_position: 8
title: Programmatischer Einsatz
description: "Laufen SigNoz MCP-Server aus Ihrem eigenen Code: über stdio, über HTTP oder auf jedem MCP-Transport."
---

# Programmatischer Einsatz

`@hoyasumii/signoz/mcp` den Server und seine Transporte exportiert.

## Stdio

```ts
import { serveSignozMcpStdio } from "@hoyasumii/signoz/mcp";

const mcp = await serveSignozMcpStdio({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
await mcp.closed; // settles when the client closes stdin
```

Stdout trägt das protokoll, so dass nichts anderes dazu schreiben kann. `stdin`/`stdout` können andere Streams sein.

## HTTP

```ts
import { startSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = await startSignozMcpServer({ port: 0, baseUrl, apiKey });
console.log(server.url); // http://127.0.0.1:<port>/mcp
await server.close();
```

`port: 0` Wählen Sie einen freien Port. `shutdownToken` ermöglicht `POST /shutdown` (Der Antrag trägt es in)
`X-Signoz-Shutdown`, und `onShutdown` läuft, nachdem er den Server geschlossen hat.

Beide nehmen `apiKey` oder `authToken` + `refreshAuthToken`, `environment` (Ausfall) `deployment.environment`) und
`sessionFile` (wo gedrehte Token bestehen bleiben).

## Jede Beförderung

```ts
import { createSignozClient } from "@hoyasumii/signoz";
import { buildSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = buildSignozMcpServer(createSignozClient({ baseUrl, apiKey }), { environment: "production" });
await server.connect(transport);
```

`buildSignozMcpServer` Antworten auf die nackte `McpServer`, wobei jedes Werkzeug registriert ist und kein Transport
beigefügt ist.

## Auch ausgeführt

- `resolveMcpConfig`, `clientFor`, `configFilePath`, `readEnvFile`, `writeEnvFile`: die Konfiguration, die die CLI
  verwendet.
- `CATALOG`, `searchCatalog`, `describeOperation`, `invoke`: Worauf laufen die generischen Tools?
- `buildDashboard`: Der Dashboard Builder, aus dem gleichen Input `signoz_create_dashboard` nimmt.
