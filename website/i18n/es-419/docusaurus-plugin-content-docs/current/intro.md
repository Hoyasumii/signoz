---
sidebar_position: 1
title: Comienzo
description: "A TypeScript SDK para el SigNoz API, con un servidor MCP y un CLI construido en él: lo que cada parte hace y cómo instalarlo."
slug: /intro
---

# Comienzo

`@hoyasumii/signoz` es un TypeScript SDK para el [SigNoz](https://signoz.io) REST API, con un servidor MCP y un CLI
construido sobre él. Úsalo de código, de un agente de IA o de su terminal: los tres comparten el mismo cliente.

- **SDK**: las 241 operaciones del funcionario SigNoz v0.142.1 especificaciones, un método tipo por `operationId`. Se
  autentica con una clave API de cuenta de servicio o con las fichas de la sesión del navegador, girando para usted.
  Comienza. [SDK](./sdk/overview.md).
- **MCP server** (G)`@hoyasumii/signoz/mcp`, bin `signoz-mcp`): HTTP tóxico o Streamable `127.0.0.1`. Herramientas
  curadas para servicios, registros, trazas, métricas y alertas, un constructor de paneles que comprueba cada panel
  contra SigNoz antes de guardar, y herramientas genéricas para el resto de la API. Comienza.
  [MCP server](./mcp/overview.md).
- **CLI** (G)`signoz`): cada herramienta MCP como subcomandante, más `signoz mcp` para configurar el servidor,
  ejecutarlo en el fondo, iniciarlo en el login y registrarlo en Claude Code, Codex y OpenCode. Inicio
  [CLI](./cli/overview.md).

Esto es un independiente, **no oficiales** proyecto, no afiliado con SigNoz Inc.

## Instalación

Requisitos Node.js 20 o más tarde.

```bash
npm i -g @hoyasumii/signoz     # or: pnpm add -g @hoyasumii/signoz
signoz mcp config              # the instance URL and an API key (or the browser tokens), saved per user
signoz mcp install             # registers the server (stdio) in Claude Code / Codex / OpenCode
```

Como biblioteca, `npm install @hoyasumii/signoz`.

## Versiones

El paquete tiene su propia versión; cada liberación espejos uno SigNoz Versión API. Usa el que coincida con tu
instancia. `signoz whoami` lo muestra como `sdkSignozVersion`, y el SDK lo exporta como `SIGNOZ_API_VERSION`.

| `@hoyasumii/signoz` | SigNoz API |
| ------------------- | ---------- |
| 0.1.x               | v0.142.1   |

## Una primera llamada

```ts
import { createSignozClient } from "@hoyasumii/signoz";

const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
const me = await signoz.users.getMyUser();
```

Desde el terminal, una vez `signoz mcp config` ha guardado una configuración:

```bash
signoz whoami
signoz list-services --since 24h
```

`signoz docs` abre este sitio.
