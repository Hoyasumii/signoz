---
sidebar_position: 1
title: Primeiros passos
description: "Um SDK TypeScript para a API do SigNoz, com um servidor MCP e uma CLI construídos sobre ele: o que cada parte faz e como instalar."
slug: /intro
---

# Primeiros passos

`@hoyasumii/signoz` é um SDK TypeScript para a API REST do [SigNoz](https://signoz.io), com um servidor MCP e uma
CLI construídos sobre ele. Use-o no código, a partir de um agente de IA ou no terminal: os três compartilham o
mesmo cliente.

- **SDK**: as 241 operações da spec oficial do SigNoz v0.142.1, um método tipado por `operationId`. Autentica com
  uma API key de service account ou com os tokens da sessão do navegador, rotacionando-os para você.
  Comece em [SDK](./sdk/overview.md).
- **Servidor MCP** (`@hoyasumii/signoz/mcp`, bin `signoz-mcp`): stdio ou Streamable HTTP em `127.0.0.1`.
  Ferramentas curadas para serviços, logs, traces, métricas e alertas, um construtor de dashboards que confere cada
  painel no SigNoz antes de salvar e ferramentas genéricas para o resto da API. Comece em
  [Servidor MCP](./mcp/overview.md).
- **CLI** (`signoz`): cada ferramenta MCP como um subcomando, mais `signoz mcp` para configurar o servidor, rodá-lo
  em segundo plano, iniciá-lo no login e registrá-lo no Claude Code, no Codex e no OpenCode. Comece em
  [CLI](./cli/overview.md).

É um projeto independente e **não oficial**, sem afiliação com a SigNoz Inc.

## Instalação

Requer Node.js 20 ou mais recente.

```bash
npm i -g @hoyasumii/signoz     # ou: pnpm add -g @hoyasumii/signoz
signoz mcp config              # a URL da instância e uma API key (ou os tokens do navegador), salvas por usuário
signoz mcp install             # registra o servidor (stdio) no Claude Code / Codex / OpenCode
```

Como biblioteca, `npm install @hoyasumii/signoz`.

## Versões

O pacote tem versão própria; cada release espelha uma versão da API do SigNoz. Use a que corresponde à sua
instância. `signoz whoami` a mostra como `sdkSignozVersion`, e o SDK a exporta como `SIGNOZ_API_VERSION`.

| `@hoyasumii/signoz` | API do SigNoz |
| ------------------- | ------------- |
| 0.1.x               | v0.142.1      |

## Uma primeira chamada

```ts
import { createSignozClient } from "@hoyasumii/signoz";

const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
const me = await signoz.users.getMyUser();
```

No terminal, depois que `signoz mcp config` salvou uma configuração:

```bash
signoz whoami
signoz list-services --since 24h
```

`signoz docs` abre este site.
