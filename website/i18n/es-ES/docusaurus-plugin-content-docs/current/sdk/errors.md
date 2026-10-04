---
sidebar_position: 3
title: Errores
description: "SignozApiError y las otras clases de error, y cómo los secretos están enmascarados en cada uno de ellos."
---

# Errores

| Clase                       | Cuando                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `SignozApiError`            | A non-2xx                                                                                         |
| `SignozSessionExpiredError` | Se denegó la rotación de la sesión: copia de las fichas nuevas (una subclase de `SignozApiError`) |
| `SignozConfigError`         | Configuración inválida: una credencial desaparecida, una URL malformada, ambas credenciales       |
| `SignozTimeoutError`        | No hay respuesta dentro `timeoutMs` (por intento)                                                 |

`SignozApiError` transporte `status`, `method`, `path` (sin la cadena de consulta), `operationId`, `code` (G)SigNoz's
`error.code`o `errorType` en las rutas Prometheus), `type` (G)e.g. `unauthenticated`, `not-found`) y la respuesta
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

## Los secretos nunca muestran

Cada mensaje de error y `body` pasar `redact`: los valores de las teclas tales como `authorization`, `apiKey`,
`accessToken` o `refreshToken` se convirtió en `***`, y también cualquier ocurrencia literal de la propia ficha o clave
del cliente, dentro de las cuerdas también. `redact` se exporta para sus propios registros:

```ts
import { redact } from "@hoyasumii/signoz";

console.log(redact(payload, [process.env.SIGNOZ_API_KEY!]));
```
