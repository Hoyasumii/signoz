---
sidebar_position: 8
title: Programmatic use
description: "Run the SigNoz MCP server from your own code: over stdio, over HTTP, or on any MCP transport."
---

# Programmatic use

`@hoyasumii/signoz/mcp` exports the server and its transports.

## Stdio

```ts
import { serveSignozMcpStdio } from "@hoyasumii/signoz/mcp";

const mcp = await serveSignozMcpStdio({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
await mcp.closed; // settles when the client closes stdin
```

stdout carries the protocol, so nothing else may write to it. `stdin`/`stdout` can be other streams.

## HTTP

```ts
import { startSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = await startSignozMcpServer({ port: 0, baseUrl, apiKey });
console.log(server.url); // http://127.0.0.1:<port>/mcp
await server.close();
```

`port: 0` picks a free port. `shutdownToken` enables `POST /shutdown` (the request carries it in
`X-Signoz-Shutdown`), and `onShutdown` runs after it closed the server.

Both take `apiKey` or `authToken` + `refreshAuthToken`, `environment` (the default `deployment.environment`) and
`sessionFile` (where rotated tokens persist).

## Any transport

```ts
import { createSignozClient } from "@hoyasumii/signoz";
import { buildSignozMcpServer } from "@hoyasumii/signoz/mcp";

const server = buildSignozMcpServer(createSignozClient({ baseUrl, apiKey }), { environment: "production" });
await server.connect(transport);
```

`buildSignozMcpServer` answers the bare `McpServer`, with every tool registered and no transport attached.

## Also exported

- `resolveMcpConfig`, `clientFor`, `configFilePath`, `readEnvFile`, `writeEnvFile`: the configuration the CLI uses.
- `CATALOG`, `searchCatalog`, `describeOperation`, `invoke`: what the generic tools run on.
- `buildDashboard`: the dashboard builder, from the same input `signoz_create_dashboard` takes.
