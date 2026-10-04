---
sidebar_position: 1
title: Aperçu général
description: "Les SigNoz client: une méthode dactylographiée par opération, groupée par tag, et comment les réponses et les erreurs reviennent."
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

`baseUrl` est l'URL de l'instance, avec son chemin de base s'il en a un (`https://example.com/signoz`) . Le client est
généré par `spec/openapi.v0.142.1.yml`: un service par étiquette de la spécification (`signoz.dashboard`,
`signoz.rules`, `signoz.querier`, ...) et une méthode par `operationId`. Chaque méthode prend `{ path, query, body }`
comme l'opération les déclare, dactylographié à partir des spécifications `components["schemas"]`.

`createSignozClientFromEnv()` lit `SIGNOZ_BASE_URL` et `SIGNOZ_API_KEY`, ou bien
`SIGNOZ_AUTH_TOKEN`/`SIGNOZ_REFRESH_AUTH_TOKEN` couple (voir [Authentification](./authentication.md)) .

## Options

| Option      | Pourquoi                                                                |
| ----------- | ----------------------------------------------------------------------- |
| `baseUrl`   | URL de l'instance (obligatoire)                                         |
| `apiKey`    | Une clé API de compte de service                                        |
| `authToken` | Avec `refreshAuthToken`: la session du navigateur au lieu d'une clé API |
| `timeoutMs` | Délai par tentative, par défaut 30000; `0` ou `Infinity` Éteins-le.     |
| `fetch`     | Une alternative `fetch` (tests, proxy)                                  |

Chaque méthode prend aussi un second argument, `RequestOptions`: `timeoutMs` pour cet appel, un `signal` pour l'annuler,
extra `headers`et `raw: true` pour obtenir le `Response` non parés (un non-2xx lance encore).

## Réponses

Comment une méthode répond dépend de l'opération:

- des `data` des `{ status, data }` enveloppe, pour la plupart;
- `void` pour un 204;
- un flux `Response` pour l'exportation brute;
- tout l'objet sur les routes Prométhée (`{ status, data, warnings, infos }`) .

Un non-2xx devient un `SignozApiError` (voir [Erreurs](./errors.md)) .

## Routes en dehors des spécifications

`signoz.request(method, path, { query, body })` appelle n'importe quel chemin avec l'authentification du client,
tournant la session sur une 401 comme n'importe quelle méthode générée.

## Ce que le paquet exporte

- `OPERATIONS` et `OPERATION_METHODS`: méthode de chaque opération, chemin, mode réponse et si elle authentifie, par
  `operationId`.
- `SIGNOZ_API_VERSION`: SigNoz version miroirs client.
- Les types de spécifications: `components`, `operations`, `paths`.

Pour chaque classe, type et fonction exportées, voir [Référence API](pathname://../../docs/api).
