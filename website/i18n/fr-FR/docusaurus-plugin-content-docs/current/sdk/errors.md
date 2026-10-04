---
sidebar_position: 3
title: Erreurs
description: "SignozApiError et les autres classes d'erreur, et comment les secrets sont masqués dans chacun d'eux."
---

# Erreurs

| Classe                      | Quand                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `SignozApiError`            | Une réponse non-2xx                                                                                   |
| `SignozSessionExpiredError` | La rotation de la session a été refusée : copie de jetons frais (une sous-classe de `SignozApiError`) |
| `SignozConfigError`         | Configuration non valide : un titre manquant, une URL mal formée, les deux identifiants               |
| `SignozTimeoutError`        | Aucune réponse `timeoutMs` (par tentative)                                                            |

`SignozApiError` porte `status`, `method`, `path` (sans la chaîne de requête), `operationId`, `code` (SigNoz's
`error.code`ou `errorType` sur les routes de Prométhée), `type` (e.g. `unauthenticated`, `not-found`) et la réponse
`body`.

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

## Les secrets ne se montrent jamais

Chaque message d'erreur et `body` Passez par `redact`: les valeurs des clés telles que `authorization`, `apiKey`,
`accessToken` ou `refreshToken` devenir `***`, ainsi que toute occurrence littérale du jeton ou de la clé du client, à
l'intérieur des chaînes aussi. `redact` est exporté pour vos propres grumes:

```ts
import { redact } from "@hoyasumii/signoz";

console.log(redact(payload, [process.env.SIGNOZ_API_KEY!]));
```
