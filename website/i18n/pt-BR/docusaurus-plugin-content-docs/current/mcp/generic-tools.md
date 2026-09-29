---
sidebar_position: 6
title: Ferramentas genéricas
description: "signoz_resources, signoz_describe e signoz_call: todas as outras operações da API REST do SigNoz."
---

# Ferramentas genéricas

As ferramentas curadas cobrem telemetria, alertas e dashboards. Para todo o resto (saved views, canais de
notificação, downtimes, service accounts, usuários, …), três ferramentas alcançam as outras ~230 operações da API
REST.

1. **`signoz_resources`** lista os serviços e suas operações. Com uma `query` (ex.: `saved view`, `downtime`,
   `notification channel`), só as que casam.
2. **`signoz_describe`** dá a assinatura completa de uma operação: parâmetros de caminho e de query, o schema do
   corpo, a permissão de que precisa e um exemplo de entrada para `signoz_call`. Com `schema`, expande um schema da
   spec (`depth` níveis, padrão 3).
3. **`signoz_call`** a executa: `operation` é `servico.metodo` (`savedView.createSavedView`) ou o `operationId`
   (`CreateSavedView`), e `args` guarda `path`, `query` e `body`.

```json
{ "operation": "rules.listRules", "args": {} }
```

## Segurança

- Parâmetros desconhecidos são recusados, então um erro de digitação não descarta um filtro em silêncio.
- Operações destrutivas (delete, revoke, disconnect, unlock) exigem `confirm: true`. O agente é orientado a perguntar
  a você antes.
- As operações do ciclo de vida da sessão, os callbacks de SSO e o export bruto ficam fora do catálogo.
- Uma resposta longa é cortada em 60.000 caracteres, avisando.

O catálogo é gerado da mesma spec OpenAPI do SDK (`pnpm codegen:mcp`).
