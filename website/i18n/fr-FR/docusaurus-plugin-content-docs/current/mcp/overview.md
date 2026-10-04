---
sidebar_position: 1
title: Aperçu général
description: "Les SigNoz Serveur MCP : transports, outils curés, constructeur de tableau de bord et outils génériques."
---

# Serveur MCP

`signoz-mcp` expose SigNoz à Claude Code, Codex, OpenCode ou tout autre client de MCP.

```bash
signoz-mcp            # stdio: what the MCP client runs
signoz-mcp --http     # http://127.0.0.1:3767/mcp (PORT changes the port)
signoz mcp start      # the same in the background; stop/status; boot enable to start it at login
```

## Outils

| Outil                                                                                  | Pourquoi                                                                                                 |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `signoz_whoami`                                                                        | Cas, mode auth, compte utilisateur ou service                                                            |
| `signoz_list_services`                                                                 | Services avec échelles, erreurs, taux d'erreur et p95: le point de départ pour trouver le `service.name` |
| `signoz_field_keys` / `signoz_field_values`                                            | Découvrez les attributs (`http.route`, `deployment.environment`, nom du travail...) et leurs valeurs     |
| `signoz_search_logs`                                                                   | Logs par service, gravité, texte et filtre v5, nouveau premier                                           |
| `signoz_search_traces` / `signoz_get_trace`                                            | Spans par service, exploitation, erreur et durée; une trace comme une cascade avec ses exceptions        |
| `signoz_query`                                                                         | les requêtes des constructeurs (traces, logs, métriques) avec des formules, ou PromQL                    |
| `signoz_list_metrics` / `signoz_query_metrics`                                         | Découvrez les métriques et interrogez-les                                                                |
| `signoz_list_alerts` / `signoz_list_rules` / `signoz_get_rule` / `signoz_rule_history` | Alertes, règles et historique                                                                            |
| `signoz_list_dashboards` / `signoz_get_dashboard`                                      | Tableaux de bord et leurs panneaux, avec un lien                                                         |
| `signoz_preview_panel`                                                                 | Exécute une définition de panneau sur les données réelles avant d'enregistrer                            |
| `signoz_create_dashboard` / `signoz_update_dashboard`                                  | Crée ou prolonge un tableau de bord à partir de préréglages et/ou de vos propres panneaux                |
| `signoz_share_dashboard`                                                               | Rendre le tableau de bord public `confirm: true`)                                                        |
| `signoz_resources` / `signoz_describe` / `signoz_call`                                 | Les autres opérations ~230: vues sauvegardées, canaux, temps d'arrêt, comptes de service...              |

- [Outils de télémétrie](./telemetry-tools.md): services, journaux, traces, requêtes et métriques.
- [Alertes](./alerts.md): lancer des alertes, des règles et leur histoire.
- [Tableaux de bord](./dashboards.md): les préréglages, vos propres panneaux et le chèque avant d'enregistrer.
- [Outils génériques](./generic-tools.md): le reste de l'API REST.

## Le mode HTTP

- Il est apatride et écoute `127.0.0.1` Seulement.
- Il refuse `Host` qui n'est pas loopback, contre la reliure DNS.
- `GET /health` réponses `{ ok, baseUrl, auth, environment, version }`.
- `POST /shutdown` avec le jeton `signoz mcp start` génère la ferme ; c'est ainsi `signoz mcp stop` arrête le serveur,
  Windows inclus.

En mode stdio, stdout porte le protocole : le serveur se connecte uniquement à stderr.

Les erreurs ne portent jamais de justificatif : chaque erreur d'outil passe par le même masque que celui du SDK.
