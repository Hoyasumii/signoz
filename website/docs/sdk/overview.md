---
sidebar_position: 1
title: Overview
description: "The SigNoz client: one typed method per operation, grouped by tag, and how responses and errors come back."
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

`baseUrl` is the instance URL, with its base path if it has one (`https://example.com/signoz`). The client is
generated from `spec/openapi.v0.142.1.yml`: one service per tag of the spec (`signoz.dashboard`,
`signoz.rules`, `signoz.querier`, …) and one method per `operationId`. Each method takes
`{ path, query, body }` as the operation declares them, typed from the spec's `components["schemas"]`.

`createSignozClientFromEnv()` reads `SIGNOZ_BASE_URL` and `SIGNOZ_API_KEY`, or else the
`SIGNOZ_AUTH_TOKEN`/`SIGNOZ_REFRESH_AUTH_TOKEN` pair (see [Authentication](./authentication.md)).

## Options

| Option      | What for                                                           |
| ----------- | ------------------------------------------------------------------ |
| `baseUrl`   | The instance URL (required)                                        |
| `apiKey`    | A service account API key                                          |
| `authToken` | With `refreshAuthToken`: the browser session instead of an API key |
| `timeoutMs` | Timeout per attempt, default 30000; `0` or `Infinity` turn it off  |
| `fetch`     | An alternative `fetch` (tests, a proxy)                            |

Each method also takes a second argument, `RequestOptions`: `timeoutMs` for that call, a `signal` to cancel it,
extra `headers`, and `raw: true` to get the `Response` unparsed (a non-2xx still throws).

## Responses

How a method answers depends on the operation:

- the `data` of the `{ status, data }` envelope, for most of them;
- `void` for a 204;
- a streamed `Response` for the raw export;
- the whole object on the Prometheus routes (`{ status, data, warnings, infos }`).

A non-2xx becomes a `SignozApiError` (see [Errors](./errors.md)).

## Routes outside the spec

`signoz.request(method, path, { query, body })` calls any path with the client's authentication, rotating the
session on a 401 like any generated method.

## What the package exports

- `OPERATIONS` and `OPERATION_METHODS`: every operation's method, path, response mode and whether it
  authenticates, by `operationId`.
- `SIGNOZ_API_VERSION`: the SigNoz version the client mirrors.
- The spec's types: `components`, `operations`, `paths`.

For every exported class, type and function, see the [API reference](pathname://../../docs/api).
