---
sidebar_position: 6
title: Ferramentas genéricas
description: "signoz_resources, signoz_describe e signoz_call: todas as outras operações da SigNoz API REST."
---

# Ferramentas genéricas

As ferramentas curadas cobrem telemetria, alertas e painéis. Para todo o resto (vistas salvas, canais de notificação,
inatividades, contas de serviço, usuários, ...) três ferramentas chegam às outras ~230 operações da API REST.

1. **`signoz_resources`** enumera os serviços e as suas operações. Com uma `query` (e.g. `saved view`, `downtime`,
   `notification channel`), apenas os correspondentes.
2. **`signoz_describe`** dá a assinatura completa de uma operação: parâmetros de localização e consulta, o esquema do
   corpo, a permissão que necessita e um exemplo `signoz_call` entrada. Com `schema`, expande um esquema a partir da
   especificação (`depth` níveis profundos, padrão 3).
3. **`signoz_call`** executa- o: `operation` é `service.method` (`savedView.createSavedView`) ou `operationId`
   (`CreateSavedView`), e `args` porções `path`, `query` e `body`.

```json
{ "operation": "rules.listRules", "args": {} }
```

## Segurança

- Parâmetros desconhecidos são recusados, então um erro de digitação não solta silenciosamente um filtro.
- Operações destrutivas (excluir, revogar, desconectar, desbloquear) `confirm: true`Diz-se ao agente para lhe perguntar
  primeiro.
- Operações de ciclo de vida da sessão, callbacks SSO e a exportação bruta são deixadas fora do catálogo.
- Uma resposta longa é cortada em 60.000 caracteres, dizendo isso.

O catálogo é gerado a partir da mesma especificação OpenAPI que o SDK (`pnpm codegen:mcp`).
