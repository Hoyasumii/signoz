---
sidebar_position: 1
title: Beginnen Sie
description: "A TypeScript SDK für die SigNoz API, mit einem MCP-Server und einer darauf aufbauenden CLI: Was macht jedes Teil und wie wird es installiert?"
slug: /intro
---

# Beginnen Sie

`@hoyasumii/signoz` ist eine TypeScript SDK für die [SigNoz](https://signoz.io) REST API, mit einem MCP-Server und einer
darauf aufbauenden CLI. Verwenden Sie es von Code, von einem KI-Agenten oder von Ihrem Terminal: Alle drei teilen sich
den gleichen Client.

- **SDK**: die 241 Operationen des Beamten SigNoz v0.142.1 Spec, eine typisierte Methode pro `operationId`Es
  authentifiziert sich mit einem Dienstkonto-API-Schlüssel oder mit den Token der Browsersitzung und rotiert sie für
  Sie. Beginn: [SDK](./sdk/overview.md).
- **MCP-Server** ()`@hoyasumii/signoz/mcp`, Bin `signoz-mcp`): stdio oder Streamable HTTP on `127.0.0.1`. Kuratierte
  Tools für Dienste, Protokolle, Traces, Metriken und Warnungen, ein Dashboard Builder, der jedes Panel gegen SigNoz vor
  dem Speichern und generische Tools für den Rest der API. Beginn: [MCP-Server](./mcp/overview.md).
- **CLI** ()`signoz`): jedes MCP-Tool als Unterbefehl, plus `signoz mcp` So konfigurieren Sie den Server, führen ihn im
  Hintergrund aus, starten ihn beim Login und registrieren ihn in Claude Code, Codex und OpenCodeBeginnen Sie mit
  [CLI](./cli/overview.md).

Dies ist eine unabhängige, **inoffiziell** Projekt, nicht verbunden mit SigNoz Inc.

## Installation

Erforderlich Node.js 20 oder später.

```bash
npm i -g @hoyasumii/signoz     # or: pnpm add -g @hoyasumii/signoz
signoz mcp config              # the instance URL and an API key (or the browser tokens), saved per user
signoz mcp install             # registers the server (stdio) in Claude Code / Codex / OpenCode
```

Als Bibliothek, `npm install @hoyasumii/signoz`.

## Fassungen

Das Paket hat eine eigene Version; jede Version spiegelt eine SigNoz API Version. Verwenden Sie diejenige, die zu Ihrer
Instanz passt. `signoz whoami` zeigt es als `sdkSignozVersion`und das SDK exportiert es als `SIGNOZ_API_VERSION`.

| `@hoyasumii/signoz` | SigNoz API |
| ------------------- | ---------- |
| 0.1.x               | v0.142.1   |

## Ein erster Aufruf

```ts
import { createSignozClient } from "@hoyasumii/signoz";

const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
const me = await signoz.users.getMyUser();
```

Vom Terminal, einmal `signoz mcp config` eine Konfiguration gespeichert hat:

```bash
signoz whoami
signoz list-services --since 24h
```

`signoz docs` öffnet diese Website.
