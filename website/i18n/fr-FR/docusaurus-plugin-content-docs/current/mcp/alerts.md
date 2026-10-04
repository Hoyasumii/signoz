---
sidebar_position: 4
title: Alertes
description: "Alertes, règles d'alerte et quand une règle a été déclenchée et résolue."
---

# Alertes

| Outil                 | Ce qu'il répond                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `signoz_list_alerts`  | Alertes actives en ce moment (feux ou silencieux): nom, gravité, depuis quand, résumé et étiquettes |
| `signoz_list_rules`   | Chaque règle : id, nom, état (firing/inactive/disabled), sévérité, type et fenêtre d'évaluation     |
| `signoz_get_rule`     | Une règle complète : son état (requêtes et seuils), les étiquettes, annotations et canaux           |
| `signoz_rule_history` | Quand une règle a été déclenchée et résolue dans une fenêtre (timeline), avec des totaux            |

`signoz_list_alerts` et `signoz_list_rules` prendre une `search` texte; `signoz_list_rules` Il faut aussi `state`.
`signoz_rule_history` prend la règle `id` et une fenêtre (`since`ou `start`/`end`), qui lie un pic avec les alertes
qu'il a soulevées.

La création, le changement ou la suppression des règles, des canaux et des temps d'arrêt passe par
[outils génériques](./generic-tools.md): `signoz_resources` avec `rules`, `channels` ou `downtime` trouve l'opération.
