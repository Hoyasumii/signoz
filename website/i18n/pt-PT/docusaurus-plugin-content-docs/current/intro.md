---
sidebar_position: 1
title: Começar
description: "A TypeScript SDK para o SigNoz API, com um servidor MCP e um CLI construído sobre ele: o que cada parte faz e como instalá-lo."
slug: /intro
---

# Começar

`@hoyasumii/signoz` é um TypeScript SDK para o [SigNoz](https://signoz.io) API REST, com um servidor MCP e um CLI
construído em cima dele. Use-o de código, de um agente de IA ou de seu terminal: todos os três compartilham o mesmo
cliente.

- **SDK**: as 241 operações do funcionário SigNoz v0.142.1 spec, um método digitado por `operationId`. Ele autentica com
  uma chave API de conta de serviço ou com os tokens da sessão do navegador, girando-os para você. Iniciar em
  [SDK](./sdk/overview.md).
- **Servidor MCP** (`@hoyasumii/signoz/mcp`, lixo `signoz-mcp`): stdio ou HTTP streamable em `127.0.0.1`. Ferramentas
  curadas para serviços, logs, traços, métricas e alertas, um construtor de painéis que verifica cada painel contra
  SigNoz antes de salvar, e ferramentas genéricas para o resto da API. Iniciar em [Servidor MCP](./mcp/overview.md).
- **CLI** (`signoz`): cada ferramenta MCP como subcomando, mais `signoz mcp` para configurar o servidor, execute-o em
  segundo plano, inicie-o no login e registre-o em Claude Code, Codex e OpenCode. Iniciar em [CLI](./cli/overview.md).

Este é um independente, **não oficial** projecto, não SigNoz Inc.

## Instalação

Requer Node.js 20 ou mais tarde.

```bash
npm i -g @hoyasumii/signoz     # or: pnpm add -g @hoyasumii/signoz
signoz mcp config              # the instance URL and an API key (or the browser tokens), saved per user
signoz mcp install             # registers the server (stdio) in Claude Code / Codex / OpenCode
```

Como biblioteca, `npm install @hoyasumii/signoz`.

## Versões

O pacote tem sua própria versão; cada versão espelha um SigNoz Versão API. Use o que combina com o seu caso.
`signoz whoami` mostra- o como `sdkSignozVersion`, e o SDK exporta-o como `SIGNOZ_API_VERSION`.

| `@hoyasumii/signoz` | SigNoz API |
| ------------------- | ---------- |
| 0.1.x               | v0.142.1   |

## Uma primeira chamada

```ts
import { createSignozClient } from "@hoyasumii/signoz";

const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
const me = await signoz.users.getMyUser();
```

Do terminal, uma vez `signoz mcp config` salvou uma configuração:

```bash
signoz whoami
signoz list-services --since 24h
```

`signoz docs` abre este site.
