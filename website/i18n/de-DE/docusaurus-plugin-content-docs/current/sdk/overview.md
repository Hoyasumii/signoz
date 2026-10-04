---
sidebar_position: 1
title: Übersicht
description: "Die SigNoz Client: eine typisierte Methode pro Operation, gruppiert nach Tags und wie Antworten und Fehler zurückkommen."
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

`baseUrl` ist die Instanz-URL mit ihrem Basispfad, wenn sie einen hat ()`https://example.com/signoz`. Der Client wird
generiert aus `spec/openapi.v0.142.1.yml`: ein Dienst pro Tag der Spezifikation (`signoz.dashboard`, `signoz.rules`,
`signoz.querier`, ... und ein Verfahren je `operationId`Jede Methode `{ path, query, body }` wie die Operation sie
erklärt, getippt von den Specs `components["schemas"]`.

`createSignozClientFromEnv()` Lesewerte `SIGNOZ_BASE_URL` und `SIGNOZ_API_KEY`oder sonst die
`SIGNOZ_AUTH_TOKEN`/`SIGNOZ_REFRESH_AUTH_TOKEN` Paar (siehe) [Authentifizierung](./authentication.md).

## Optionen

| Option      | Was ist                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| `baseUrl`   | Die Instanz URL (erforderlich)                                                    |
| `apiKey`    | Ein Service Account API Key                                                       |
| `authToken` | mit `refreshAuthToken`Browser-Sitzung statt API-Schlüssel                         |
| `timeoutMs` | Timeout pro Versuch, standardmäßig 30000; `0` oder `Infinity` Schalten Sie es aus |
| `fetch`     | Eine Alternative `fetch` (Tests, ein Proxy)                                       |

Jede Methode nimmt auch ein zweites Argument, `RequestOptions`: `timeoutMs` Für diesen Aufruf, ein `signal` um es zu
stornieren, extra `headers`, und `raw: true` um die `Response` unparsed (ein non-2xx wirft immer noch).

## Antworten

Wie eine Methode antwortet, hängt von der Operation ab:

- das `data` von `{ status, data }` Umschlag, für die meisten von ihnen;
- `void` für eine 204;
- a gestreamt `Response` für die Rohausfuhr;
- das gesamte Objekt auf den Prometheus Routen ()`{ status, data, warnings, infos }`.

Ein Non-2xx wird zu einem `SignozApiError` (siehe) [Fehler](./errors.md).

## Routen außerhalb der Spec

`signoz.request(method, path, { query, body })` ruft einen beliebigen Pfad mit der Authentifizierung des Clients auf und
dreht die Sitzung auf einem 401 wie jede andere generierte Methode.

## Was das Paket exportiert

- `OPERATIONS` und `OPERATION_METHODS`: Methode, Pfad, Antwortmodus jeder Operation und ob sie sich authentifiziert,
  durch `operationId`.
- `SIGNOZ_API_VERSION`: der SigNoz Version der Client Mirrors.
- Die Typen der Spec: `components`, `operations`, `paths`.

Für jede exportierte Klasse, Typ und Funktion siehe [API-Referenz](pathname://../../docs/api).
