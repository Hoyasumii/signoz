---
sidebar_position: 3
title: Fehler
description: "SignozApiError und die anderen Fehlerklassen und wie Geheimnisse in jedem von ihnen maskiert werden."
---

# Fehler

| Klasse                      | Wann                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `SignozApiError`            | Eine Non-2xx Antwort                                                                                          |
| `SignozSessionExpiredError` | Die Sitzungsdrehung wurde abgelehnt: Kopieren Sie neue Token (eine Unterklasse von) `SignozApiError`)         |
| `SignozConfigError`         | Ungültige Konfiguration: eine fehlende Anmeldeinformationen, eine fehlerhafte URL, beide Anmeldeinformationen |
| `SignozTimeoutError`        | Keine Antwort innerhalb `timeoutMs` (pro Versuch)                                                             |

`SignozApiError` Wagen `status`, `method`, `path` (ohne Query String) `operationId`, `code` ()SigNozs `error.code`, oder
`errorType` auf den Prometheus-Strecken, `type` ()e.g. `unauthenticated`, `not-found`) und die Antwort `body`.

```ts
import { SignozApiError } from "@hoyasumii/signoz";

try {
  await signoz.dashboard.getDashboardV2({ path: { id: "missing" } });
} catch (error) {
  if (error instanceof SignozApiError && error.status === 404) {
    // …
  } else throw error;
}
```

## Geheimnisse zeigen nie

Jede Fehlermeldung und `body` durchgehen `redact`: die Werte von Schlüsseln wie `authorization`, `apiKey`, `accessToken`
oder `refreshToken` werden `***`, ebenso wie jedes wörtliche Auftreten des eigenen Tokens oder Schlüssels des Kunden,
auch innerhalb von Strings. `redact` wird für Ihre eigenen Logs exportiert:

```ts
import { redact } from "@hoyasumii/signoz";

console.log(redact(payload, [process.env.SIGNOZ_API_KEY!]));
```
