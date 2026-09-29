---
sidebar_position: 1
title: Getting started
description: "A TypeScript SDK for the SigNoz API, with an MCP server and a CLI built on it: what each part does and how to install it."
slug: /intro
---

# Getting started

`@hoyasumii/signoz` is a TypeScript SDK for the [SigNoz](https://signoz.io) REST API, with an MCP server and a
CLI built on top of it. Use it from code, from an AI agent, or from your terminal: all three share the same
client.

- **SDK**: the 241 operations of the official SigNoz v0.142.1 spec, one typed method per `operationId`. It
  authenticates with a service account API key or with the browser session's tokens, rotating them for you.
  Start at [SDK](./sdk/overview.md).
- **MCP server** (`@hoyasumii/signoz/mcp`, bin `signoz-mcp`): stdio or Streamable HTTP on `127.0.0.1`. Curated
  tools for services, logs, traces, metrics and alerts, a dashboard builder that checks every panel against
  SigNoz before saving, and generic tools for the rest of the API. Start at [MCP server](./mcp/overview.md).
- **CLI** (`signoz`): every MCP tool as a subcommand, plus `signoz mcp` to configure the server, run it in the
  background, start it at login and register it in Claude Code, Codex and OpenCode. Start at
  [CLI](./cli/overview.md).

This is an independent, **unofficial** project, not affiliated with SigNoz Inc.

## Installation

Requires Node.js 20 or later.

```bash
npm i -g @hoyasumii/signoz     # or: pnpm add -g @hoyasumii/signoz
signoz mcp config              # the instance URL and an API key (or the browser tokens), saved per user
signoz mcp install             # registers the server (stdio) in Claude Code / Codex / OpenCode
```

As a library, `npm install @hoyasumii/signoz`.

## Versions

The package has its own version; each release mirrors one SigNoz API version. Use the one that matches your
instance. `signoz whoami` shows it as `sdkSignozVersion`, and the SDK exports it as `SIGNOZ_API_VERSION`.

| `@hoyasumii/signoz` | SigNoz API |
| ------------------- | ---------- |
| 0.1.x               | v0.142.1   |

## A first call

```ts
import { createSignozClient } from "@hoyasumii/signoz";

const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
const me = await signoz.users.getMyUser();
```

From the terminal, once `signoz mcp config` has saved a configuration:

```bash
signoz whoami
signoz list-services --since 24h
```

`signoz docs` opens this site.
