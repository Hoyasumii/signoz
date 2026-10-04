---
sidebar_position: 1
title: Sinopsis
description: "El SigNoz cliente: un método tipo por operación, agrupado por etiqueta, y cómo las respuestas y errores regresan."
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

`baseUrl` es la URL de instancia, con su ruta base si tiene uno (`https://example.com/signoz`). El cliente se genera a
partir de `spec/openapi.v0.142.1.yml`: un servicio por etiqueta de la especie (`signoz.dashboard`, `signoz.rules`,
`signoz.querier`, ...) y un método por `operationId`. Cada método toma `{ path, query, body }` como la operación los
declara, escrito de la especie `components["schemas"]`.

`createSignozClientFromEnv()` lecturas `SIGNOZ_BASE_URL` y `SIGNOZ_API_KEY`, o de lo contrario
`SIGNOZ_AUTH_TOKEN`/`SIGNOZ_REFRESH_AUTH_TOKEN` par (ver [Autenticación](./authentication.md)).

## Opciones

| Opción      | ¿Para qué?                                                                   |
| ----------- | ---------------------------------------------------------------------------- |
| `baseUrl`   | La URL de instancia (requiere)                                               |
| `apiKey`    | Una cuenta de servicio API clave                                             |
| `authToken` | Con `refreshAuthToken`: la sesión del navegador en lugar de una clave de API |
| `timeoutMs` | Timeout per attempt, default 30000; `0` o `Infinity` Apágalo.                |
| `fetch`     | Una alternativa `fetch` (pruebas, un proxy)                                  |

Cada método también toma un segundo argumento, `RequestOptions`: `timeoutMs` para esa llamada, una `signal` para
cancelarlo, extra `headers`, y `raw: true` para conseguir el `Response` sin par (un no-2xx todavía tira).

## Respuestas

Cómo un método responde depende de la operación:

- el `data` de la `{ status, data }` sobre, para la mayoría de ellos;
- `void` para un 204;
- a streamed `Response` para la exportación cruda;
- todo el objeto en las rutas de Prometeo (`{ status, data, warnings, infos }`).

Un no-2x se convierte en un `SignozApiError` (ver [Errores](./errors.md)).

## Rutas fuera de la especie

`signoz.request(method, path, { query, body })` llama cualquier camino con la autenticación del cliente, girando la
sesión en un 401 como cualquier método generado.

## Qué exporta el paquete

- `OPERATIONS` y `OPERATION_METHODS`: cada método de operación, camino, modo de respuesta y si autentifica, por
  `operationId`.
- `SIGNOZ_API_VERSION`: SigNoz versión los espejos del cliente.
- Los tipos de la especie: `components`, `operations`, `paths`.

Para cada clase exportada, tipo y función, vea la [Referencia de API](pathname://../../docs/api).
