---
sidebar_position: 3
title: Errors
description: "SignozApiError and the other error classes, and how secrets are masked in every one of them."
---

# Errors

| Class                       | When                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `SignozApiError`            | A non-2xx response                                                                 |
| `SignozSessionExpiredError` | The session rotate was refused: copy fresh tokens (a subclass of `SignozApiError`) |
| `SignozConfigError`         | Invalid configuration: a missing credential, a malformed URL, both credentials     |
| `SignozTimeoutError`        | No response within `timeoutMs` (per attempt)                                       |

`SignozApiError` carries `status`, `method`, `path` (without the query string), `operationId`, `code` (SigNoz's
`error.code`, or `errorType` on the Prometheus routes), `type` (e.g. `unauthenticated`, `not-found`) and the
response `body`.

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

## Secrets never show

Every error's message and `body` go through `redact`: the values of keys such as `authorization`, `apiKey`,
`accessToken` or `refreshToken` become `***`, and so does any literal occurrence of the client's own token or
key, inside strings too. `redact` is exported for your own logs:

```ts
import { redact } from "@hoyasumii/signoz";

console.log(redact(payload, [process.env.SIGNOZ_API_KEY!]));
```
