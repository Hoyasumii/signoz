---
sidebar_position: 3
title: Outils de télémétrie
description: "Services, attributs, journaux, traces, PromQL les questions et les mesures : les outils qui lisent la télémétrie."
---

# Outils de télémétrie

## Windows et environnements

Chaque outil de télémétrie prend sa fenêtre comme `since` (`15m`, `6h`, `7d`; par défaut `1h`) ou `start`/`end` (ISO
8601 ou millisecondes d'époque; `end` par défaut jusqu'à maintenant).

Les outils qui filtrent par environnement ajouter `deployment.environment = <SIGNOZ_ENV>` quand un environnement par
défaut est configuré. `environment` sur un appel choisit un autre, et `environment: "all"` goutte le filtre.
`signoz_query` est l'exception: il ajoute le filtre seulement lorsque vous passez `environment`.

Utilisation des filtres SigNozsyntaxe d'expression v5 : `service.name = 'point-api' AND has_error = true`.

## Trouver ce qui existe en premier

| Outil                  | Ce qu'il répond                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `signoz_list_services` | Services qui ont envoyé des spans dans la fenêtre : spans, erreurs, taux d'erreur, p95. `search` étroit |
| `signoz_field_keys`    | Attribut et noms de champs de ressources pour `signal` (`traces`, `logs`, `metrics`)                    |
| `signoz_field_values`  | Valeurs d'un champ (`name`), éventuellement limité par `search` et par `existingQuery`                  |

Utilisez-les pour trouver le exact `service.name`, l'attribut qui nomme une route ou un travail, et les environnements.

## Loges et traces

- `signoz_search_logs`: les dernières lignes par `service`, `severity` (e.g. `["ERROR", "FATAL"]`), `text` (une
  sous-chaîne du corps) et `filter`D'abord la dernière. Lignes portées `trace_id` lorsque le log est corrélé;
  `withAttributes` ajoute chaque attribut.
- `signoz_search_traces`: les dernières `service`, `operation` (le nom de la portée), `errorsOnly`, `minDurationMs` et
  `filter`, première plus récente ou la plus lente d'abord (`orderBy`) . `fields` ajoute des attributs à chaque ligne.
- `signoz_get_trace`: une trace comme cascade, avec le service racine, la portée et l'erreur compte, la profondeur, la
  durée et les attributs HTTP/DB clés, et ses exceptions.

## Questions

`signoz_query` lance des requêtes de constructeur sur des traces, des logs ou des métriques, avec des formules, ou un
PromQL requête : les mêmes requêtes qu'un panneau de tableau de bord fonctionne. `requestType` choisit la forme:

- `time_series` (par défaut): chaque série est résumée en min, max, moyenne, dernière valeur et heure du pic.
  `withPoints` additionne jusqu'à 60 points par série; `stepSeconds` définit la taille du seau.
- `scalar`: une rangée par groupe.
- `raw`: rangées.

Utilisez-le pour étudier un pic, et pour vérifier une requête avant de la mettre sur un tableau de bord.

## métriques

- `signoz_list_metrics`: noms métriques reçus dans la fenêtre, avec type, unité et description. Avec `name`, les
  métadonnées de cette seule métrique (type, temporalité, unité).
- `signoz_query_metrics`: une métrique avec le temps, par `metric` avec `timeAggregation` (par défaut) `rate`; `avg` ou
  `latest` pour les jauges, `spaceAggregation` (par défaut) `sum`; `p50`...`p99` pour les histogrammes), `filter` et
  `groupBy` — ou `promql` à la place.
