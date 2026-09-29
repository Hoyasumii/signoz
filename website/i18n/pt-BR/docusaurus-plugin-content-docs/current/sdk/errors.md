---
sidebar_position: 3
title: Erros
description: "SignozApiError e as outras classes de erro, e como os segredos são mascarados em todas elas."
---

# Erros

| Classe                      | Quando                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `SignozApiError`            | Uma resposta não-2xx                                                                     |
| `SignozSessionExpiredError` | A rotação da sessão foi recusada: copie tokens novos (uma subclasse de `SignozApiError`) |
| `SignozConfigError`         | Configuração inválida: credencial ausente, URL malformada, as duas credenciais           |
| `SignozTimeoutError`        | Nenhuma resposta dentro de `timeoutMs` (por tentativa)                                   |

`SignozApiError` traz `status`, `method`, `path` (sem a query string), `operationId`, `code` (o `error.code` do
SigNoz, ou `errorType` nas rotas Prometheus), `type` (ex.: `unauthenticated`, `not-found`) e o `body` da resposta.

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

## Segredos nunca aparecem

A mensagem e o `body` de todo erro passam por `redact`: os valores de chaves como `authorization`, `apiKey`,
`accessToken` ou `refreshToken` viram `***`, assim como qualquer ocorrência literal do próprio token ou chave do
cliente, inclusive dentro de strings. `redact` é exportado para os seus logs:

```ts
import { redact } from "@hoyasumii/signoz";

console.log(redact(payload, [process.env.SIGNOZ_API_KEY!]));
```
