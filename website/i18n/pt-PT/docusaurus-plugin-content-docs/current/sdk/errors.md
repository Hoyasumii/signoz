---
sidebar_position: 3
title: Erros
description: "SignozApiError e as outras classes de erro, e como segredos são mascarados em cada um deles."
---

# Erros

| Classe                      | Quando                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `SignozApiError`            | Uma resposta não- 2xx                                                                     |
| `SignozSessionExpiredError` | A rotação da sessão foi recusada: copiar fichas novas (uma subclasse de `SignozApiError`) |
| `SignozConfigError`         | Configuração inválida: falta uma credencial, uma URL mal formada, ambas as credenciais    |
| `SignozTimeoutError`        | Nenhuma resposta dentro `timeoutMs` (por tentativa)                                       |

`SignozApiError` carrega `status`, `method`, `path` (sem o texto da consulta), `operationId`, `code` (SigNoz's
`error.code`, ou `errorType` nas rotas de Prometeu), `type` (e.g. `unauthenticated`, `not-found`) e a resposta `body`.

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

Cada mensagem de erro e `body` passar `redact`: os valores de chaves como `authorization`, `apiKey`, `accessToken` ou
`refreshToken` tornar `***`, assim como qualquer ocorrência literal do próprio token ou chave do cliente, dentro de
strings também. `redact` é exportado para os seus próprios logs:

```ts
import { redact } from "@hoyasumii/signoz";

console.log(redact(payload, [process.env.SIGNOZ_API_KEY!]));
```
