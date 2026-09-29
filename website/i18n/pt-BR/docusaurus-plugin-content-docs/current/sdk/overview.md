---
sidebar_position: 1
title: Visão geral
description: "O cliente do SigNoz: um método tipado por operação, agrupados por tag, e como voltam respostas e erros."
---

# SDK

```ts
import { createSignozClient } from "@hoyasumii/signoz";

const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });

const me = await signoz.users.getMyUser();
const page = await signoz.dashboard.listDashboardsV2({ query: { limit: 20 } });
const result = await signoz.querier.queryRangeV5({
  body: {
    /* Querybuildertypesv5QueryRangeRequest */
  },
});
```

`baseUrl` é a URL da instância, com o caminho base se houver (`https://example.com/signoz`). O cliente é gerado a
partir de `spec/openapi.v0.142.1.yml`: um serviço por tag da spec (`signoz.dashboard`, `signoz.rules`,
`signoz.querier`, …) e um método por `operationId`. Cada método recebe `{ path, query, body }` como a operação os
declara, tipados pelos `components["schemas"]` da spec.

`createSignozClientFromEnv()` lê `SIGNOZ_BASE_URL` e `SIGNOZ_API_KEY`, ou então o par
`SIGNOZ_AUTH_TOKEN`/`SIGNOZ_REFRESH_AUTH_TOKEN` (veja [Autenticação](./authentication.md)).

## Opções

| Opção       | Para quê                                                              |
| ----------- | --------------------------------------------------------------------- |
| `baseUrl`   | A URL da instância (obrigatória)                                      |
| `apiKey`    | Uma API key de service account                                        |
| `authToken` | Com `refreshAuthToken`: a sessão do navegador no lugar de uma API key |
| `timeoutMs` | Timeout por tentativa, padrão 30000; `0` ou `Infinity` o desligam     |
| `fetch`     | Um `fetch` alternativo (testes, um proxy)                             |

Cada método aceita também um segundo argumento, `RequestOptions`: `timeoutMs` para aquela chamada, um `signal` para
cancelá-la, `headers` extras e `raw: true` para receber o `Response` sem parse (um não-2xx ainda lança).

## Respostas

O que um método devolve depende da operação:

- o `data` do envelope `{ status, data }`, na maioria delas;
- `void` para um 204;
- um `Response` em stream para o export bruto;
- o objeto inteiro nas rotas Prometheus (`{ status, data, warnings, infos }`).

Um não-2xx vira `SignozApiError` (veja [Erros](./errors.md)).

## Rotas fora da spec

`signoz.request(method, path, { query, body })` chama qualquer caminho com a autenticação do cliente, rotacionando
a sessão num 401 como qualquer método gerado.

## O que o pacote exporta

- `OPERATIONS` e `OPERATION_METHODS`: o método, o caminho, o modo de resposta e se autentica, de cada operação, por
  `operationId`.
- `SIGNOZ_API_VERSION`: a versão do SigNoz que o cliente espelha.
- Os tipos da spec: `components`, `operations`, `paths`.

Para cada classe, tipo e função exportados, veja a [referência da API](pathname://../../../docs/api).
