---
sidebar_position: 1
title: Début
description: "A TypeScript SDK pour le SigNoz API, avec un serveur MCP et un CLI construit dessus : ce que chaque partie fait et comment l'installer."
slug: /intro
---

# Début

`@hoyasumii/signoz` est TypeScript SDK pour le [SigNoz](https://signoz.io) API REST, avec un serveur MCP et un CLI en
plus. Utilisez-le à partir du code, d'un agent d'IA ou de votre terminal : les trois partagent le même client.

- **SDK**: les 241 opérations du fonctionnaire SigNoz v0.142.1 spec, une méthode dactylographiée par `operationId`. Il
  s'authentifie avec une clé API de compte de service ou avec les jetons de la session du navigateur, les tournant pour
  vous. Commencez par [SDK](./sdk/overview.md).
- **Serveur MCP** (`@hoyasumii/signoz/mcp`, boîte `signoz-mcp`): stdio ou HTTP Streamable sur `127.0.0.1`. Outils curés
  pour services, journaux, traces, métriques et alertes, un constructeur de tableau de bord qui vérifie chaque panneau
  contre SigNoz avant l'enregistrement, et outils génériques pour le reste de l'API. Commencez par
  [Serveur MCP](./mcp/overview.md).
- **CLI** (`signoz`): chaque outil MCP comme sous-commande, plus `signoz mcp` pour configurer le serveur, l'exécuter en
  arrière-plan, le démarrer à la connexion et l'enregistrer dans Claude Code, Codex et OpenCode. Commence par
  [CLI](./cli/overview.md).

C'est un indépendant, **non officielle** projet, non affilié à SigNoz Autres

## Installation

Nécessaire Node.js 20 ou plus.

```bash
npm i -g @hoyasumii/signoz     # or: pnpm add -g @hoyasumii/signoz
signoz mcp config              # the instance URL and an API key (or the browser tokens), saved per user
signoz mcp install             # registers the server (stdio) in Claude Code / Codex / OpenCode
```

Comme bibliothèque, `npm install @hoyasumii/signoz`.

## Versions

Le paquet a sa propre version ; chaque release miroirs un SigNoz Version API. Utilisez celui qui correspond à votre
instance. `signoz whoami` montre que `sdkSignozVersion`, et le SDK l'exporte comme `SIGNOZ_API_VERSION`.

| `@hoyasumii/signoz` | SigNoz API |
| ------------------- | ---------- |
| 0.1.x               | v0.142.1   |

## Un premier appel

```ts
import { createSignozClient } from "@hoyasumii/signoz";

const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
const me = await signoz.users.getMyUser();
```

Depuis le terminal, une fois `signoz mcp config` a enregistré une configuration :

```bash
signoz whoami
signoz list-services --since 24h
```

`signoz docs` ouvre ce site.
