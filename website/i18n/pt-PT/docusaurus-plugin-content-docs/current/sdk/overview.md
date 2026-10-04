---
sidebar_position: 1
title: Visão geral
description: "A SigNoz cliente: um método digitado por operação, agrupado por tag, e como respostas e erros retornam."
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

`baseUrl` é o URL da instância, com o seu caminho base se tiver um (`https://example.com/signoz`). O cliente é gerado de
`spec/openapi.v0.142.1.yml`: um serviço por etiqueta da especificação (`signoz.dashboard`, `signoz.rules`,
`signoz.querier`, ...) e um método por `operationId`. Cada método leva `{ path, query, body }` como a operação os
declara, datilografados a partir da especificação `components["schemas"]`.

`createSignozClientFromEnv()` leituras `SIGNOZ_BASE_URL` e `SIGNOZ_API_KEY`, ou então o
`SIGNOZ_AUTH_TOKEN`/`SIGNOZ_REFRESH_AUTH_TOKEN` par (ver [autenticação](./authentication.md)).

## Opções

| Opção       | Para quê?                                                                |
| ----------- | ------------------------------------------------------------------------ |
| `baseUrl`   | O URL da instância (obrigatório)                                         |
| `apiKey`    | Uma chave API de conta de serviço                                        |
| `authToken` | Com `refreshAuthToken`: a sessão do navegador em vez de uma chave de API |
| `timeoutMs` | Tempo limite por tentativa, padrão 30000; `0` ou `Infinity` Desliga-o.   |
| `fetch`     | Uma alternativa `fetch` (testes, um proxy)                               |

Cada método também tem um segundo argumento, `RequestOptions`: `timeoutMs` para essa chamada, `signal` para cancelar,
extra `headers`, e `raw: true` para obter o `Response` sem análise (um não- 2xx ainda lança).

## Respostas

Como um método responde depende da operação:

- a `data` da `{ status, data }` Envelope, para a maioria deles;
- `void` de 204;
- um fluxo `Response` Para a exportação em bruto;
- todo o objeto nas rotas de Prometeu (`{ status, data, warnings, infos }`).

Um não- 2xx torna- se um `SignozApiError` (ver [Erros](./errors.md)).

## Rotas fora da especificação

`signoz.request(method, path, { query, body })` chama qualquer caminho com a autenticação do cliente, girando a sessão
em um 401 como qualquer método gerado.

## O que o pacote exporta

- `OPERATIONS` e `OPERATION_METHODS`: método de cada operação, caminho, modo de resposta e se autentica, por
  `operationId`.
- `SIGNOZ_API_VERSION`: o SigNoz versão espelhos cliente.
- Os tipos da especificação: `components`, `operations`, `paths`.

Para cada classe, tipo e função exportadas, consulte [Referência da API](pathname://../../docs/api).
