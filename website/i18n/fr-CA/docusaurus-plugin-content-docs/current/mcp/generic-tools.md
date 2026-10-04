---
sidebar_position: 6
title: Outils génériques
description: "signoz_resources, signoz_describe et signoz_call: toutes les autres opérations de la SigNoz L'API REST."
---

# Outils génériques

Les outils sélectionnés couvrent la télémétrie, les alertes et les tableaux de bord. Pour tout le reste (vues
sauvegardées, canaux de notification, temps d'arrêt, comptes de service, utilisateurs, ...) trois outils atteignent les
autres opérations ~230 de l'API REST.

1. **`signoz_resources`** liste les services et leurs opérations. Avec `query` (e.g. `saved view`, `downtime`,
   `notification channel`), seulement ceux qui correspondent.
2. **`signoz_describe`** donne la pleine signature d'une opération: paramètres de chemin et de requête, le schéma du
   corps, l'autorisation nécessaire et un exemple `signoz_call` Entrée. Avec `schema`, il élargit un schéma de la
   spécification (`depth` niveaux profonds, par défaut 3).
3. **`signoz_call`** exécute : `operation` est `service.method` (`savedView.createSavedView`) ou les `operationId`
   (`CreateSavedView`), et `args` cales `path`, `query` et `body`.

```json
{ "operation": "rules.listRules", "args": {} }
```

## Sécurité

- Les paramètres inconnus sont refusés, de sorte qu'une typographie ne dépose pas silencieusement un filtre.
- Opérations destructives (supprimer, révoquer, déconnecter, déverrouiller) `confirm: true`L'agent doit te demander
  d'abord.
- Les opérations de cycle de vie de session, les rappels SSO et l'exportation brute sont exclus du catalogue.
- Une longue réponse est coupée à 60 000 caractères, le disant.

Le catalogue est généré à partir de la même spécification OpenAPI que le SDK (`pnpm codegen:mcp`) .
