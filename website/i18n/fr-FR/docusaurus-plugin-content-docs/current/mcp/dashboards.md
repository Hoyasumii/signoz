---
sidebar_position: 5
title: Tableaux de bord
description: "Construire SigNoz tableaux de bord des préréglages et de vos propres panneaux SigNoz avant que quelque chose ne soit sauvé."
---

# Tableaux de bord

`signoz_create_dashboard` construit un tableau de bord dans SigNozformat v2 (perses, `schemaVersion: "v6"`) sur une
grille de 12 colonnes, et répond `url`.

## Préréglage

- `api_red`: requêtes, taux d'erreur, latence p50/p95/p99, requêtes par statut, les paramètres qui échouent le plus et
  les dernières requêtes manquées. Construit à partir des travées d'entrée du service (`kind_string = 'Server'`,
  réglable en `filter`); `routeAttribute` nom du paramètre (par défaut) `http.route`) .
- `worker_failures`: parcours et échecs par emploi, durée p95, une table par emploi, les derniers échecs et les journaux
  d'erreurs. `filter` sélectionne les échelles qui sont des emplois (e.g. `name LIKE 'job.%'`), et `jobAttribute`
  l'attribut qui les nomme (par défaut le nom de la plage).
- `logs_errors`: ERROR/FATAL par gravité et les dernières lignes.

Chaque preset prend une `service`, et éventuellement `environment` et a `title`.

## Vos propres panneaux

`sections` tient vos propres sections (une rangée pliable chacun, avec un `title`) des `panels`:

| Champ                  | Pourquoi                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `title`, `description` | L'en-tête du panneau                                                                |
| `kind`                 | `timeseries`, `bar`, `number`, `table`, `pie`, `list` ou `text`                     |
| `queries`, `formulas`  | Les requêtes des constructeurs (A, B, ...) et les formules telles que `A / B * 100` |
| `promql`               | A PromQL requête au lieu des requêtes du constructeur                               |
| `text`                 | Markdown, pour un `text` panneau                                                    |
| `unit`                 | `ns`, `ms`, `s`, `percent`, `reqps`, `short`, `bytes`…                              |
| `thresholds`           | Lignes (horaires/bar) ou règles de couleur (nombre)                                 |
| `width`, `height`      | Colonnes sur 12 et rangées                                                          |

Plusieurs requêtes, ou n'importe quelle formule, font une requête composite par panneau. `list` les panneaux prennent
une requête de constructeur sans agrégation, et montrent des lignes brutes ou des travées.

Essayez d'abord un panneau avec `signoz_preview_panel`: il utilise la même définition contre les données en direct et
répond à ce que le panel montrerait, ou SigNozL'erreur.

## La vérification avant l'enregistrement

Avant d'enregistrer, chaque panneau exécute sa requête SigNoz (`validate: "run"`, après `checkWindow`, par défaut `1h`)
. Si un panel échoue, rien n'est sauvé, et la réponse indique quel panel a échoué avec SigNozSon propre message. Les
panneaux sans données dans la fenêtre de vérification sont également listés. `dryRun: true` répond au JSON sans
épargner.

Les panneaux de trace et de log sont des requêtes de constructeur, donc SigNoz offres **Afficher les traces / Afficher
les journaux** lorsque vous cliquez sur un point sur le graphique, sur le même intervalle.

## Exemple

```bash
signoz list-services --since 24h --search point
signoz create-dashboard --title "Point — API and workers (production)" --tags team:point \
  --presets '[{"preset":"api_red","service":"point-api"},{"preset":"worker_failures","service":"point-worker"},{"preset":"logs_errors","service":"point-api"}]'
```

## Changement et partage

- `signoz_update_dashboard` avec `mode: "append"` (par défaut) ajoute des préréglages et des sections sous les panneaux
  existants; `mode: "replace"` reconstruit le tableau de bord à partir de l'entrée. Les panneaux sont vérifiés de la
  même manière.
- `signoz_list_dashboards` et `signoz_get_dashboard` les relire (`raw: true` pour le JSON complet).
- `signoz_share_dashboard` rend un tableau de bord visible sans connexion via un lien public. Toute personne avec le
  lien voit ses données, donc il a besoin `confirm: true`. Le partage à l'intérieur de l'organisation n'a pas besoin
  d'appel : envoyez l'URL du tableau de bord.
