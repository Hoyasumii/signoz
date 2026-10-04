---
sidebar_position: 1
title: Aperçu général de la CLI
description: "La commande signoz : chaque outil MCP en tant que sous-commande, avec le schéma d'entrée de l'outil comme drapeau."
---

# CLI

Le paquet installe un `signoz` commande. Il s'agit d'un client MCP du [même serveur](../mcp/overview.md): chaque outil
MCP devient une sous-commande, et le schéma d'entrée de l'outil devient ses drapeaux. Par défaut, le serveur fonctionne
dans la commande, il n'y a donc rien à commencer.

```bash
npx signoz mcp config                          # once: the instance URL and an API key (or the browser tokens)
npx signoz tools                               # every command, one per MCP tool
npx signoz whoami
npx signoz list-services --since 24h
npx signoz search-logs --service point-api --severity ERROR,FATAL --since 30m
npx signoz search-traces --service point-api --errors-only --min-duration-ms 500
npx signoz get-trace --trace-id 4bf92f3577b34da6a3ce929d0e0e4736
npx signoz resources --query "saved view"
npx signoz call --operation rules.listRules
```

Rien que `--help`, `--version`, `signoz docs`, `signoz mcp config` et `signoz mcp uninstall` s'exécute jusqu'à ce qu'une
configuration avec une URL et un justificatif soit sauvegardé. `signoz docs` imprime le lien vers ce site et l'ouvre
dans le navigateur.

## Des outils aux commandes

- La commande est le nom de l'outil sans `signoz_`, en kébab: `signoz_search_logs` → `search-logs`.
- Chaque drapeau est une entrée en kebab-case: `traceId` → `--trace-id`, `errorsOnly` → `--errors-only`.
- Prise de drapeaux d'array `a,b` ou JSON, les drapeaux d'objet prennent JSON, et les drapeaux booléens n'ont pas besoin
  de valeur.
- `signoz <command> --help` liste les drapeaux d'une commande, avec les valeurs autorisées des entrées enum.

La sortie de l'outil va à stdout. Une erreur d'outil va à stderr avec le code de sortie 1.

## Paramètres uniques et serveur en cours d'exécution

`--base-url`, `--api-key` et `--env` remplacer l'environnement et le fichier sauvegardé pour une seule exécution du
serveur en cours de traitement. Pour utiliser un `signoz-mcp` qui est déjà en cours d'exécution sur HTTP à la place,
passez `--url http://127.0.0.1:3767/mcp` ou ensemble `SIGNOZ_MCP_URL`. Ces drapeaux fonctionnent n'importe où sur la
ligne de commande.

Aucun d'entre eux ne correspond à la configuration enregistrée : le CLI refuse d'exécuter des outils sans elle, même
lorsque `--url` ou `--api-key` est donné.

## Gestion du serveur

`signoz mcp` est intercepté avant toute connexion. Il configure le serveur, l'exécute en arrière-plan, le démarre à la
connexion et l'enregistre dans vos clients MCP. Voir [`signoz mcp`](./mcp-commands.md).
