---
sidebar_position: 2
title: signoz mcp
description: "signoz mcp : enregistrez la configuration, lancez le serveur en arrière-plan, démarrez-le à la connexion et enregistrez-le dans vos clients MCP."
---

# `signoz mcp`

`signoz mcp` gère le serveur MCP pour vous : sa configuration sauvegardée, un serveur HTTP de fond, un service de
connexion et son enregistrement dans vos clients MCP.

```bash
npx signoz mcp config                 # asks for the settings in the terminal and saves them
npx signoz mcp config --env production --port 4000   # no prompts (scripts, CI): saves just these, keeps the rest
npx signoz mcp config --web           # the same, in a local web form
npx signoz mcp install                # pick Claude Code / Codex / OpenCode and register signoz-mcp (stdio) in them
npx signoz mcp install --client claude,opencode --force   # no picker (scripts, CI); --force replaces an entry
npx signoz mcp uninstall              # pick the clients to remove the 'signoz' entry from (no saved config needed)
npx signoz mcp start                  # start in the background (needs a saved config); prints the URL for `claude mcp add`
npx signoz mcp start --api-key other --port 4000   # one-off values, never saved
npx signoz mcp status                 # running or stopped (exit 3), URL, pid, uptime
npx signoz mcp stop
npx signoz mcp boot enable            # start at every login; `boot disable` / `boot status`
```

## `signoz mcp config`

Écrit le sauvé `.env` ([Configuration](../mcp/configuration.md)) . Il fonctionne de trois façons:

- **Dans le terminal** (par défaut). Il demande à chaque réglage à son tour, à partir des valeurs enregistrées. Les
  secrets sont tapés masqués : entrez garde celui qui est sauvé, et `-` C'est clair.
- **Avec des drapeaux.** Compte tenu de `--base-url`, `--api-key`, `--auth-token`, `--refresh-auth-token`, `--env` ou
  `--port`, il ne demande rien et sauve juste ceux-là. Sans terminal, il en a besoin. Un secret passé comme un drapeau
  reste dans votre histoire de coquille, alors préférez l'invite pour elle.
- **Sous une forme web** avec `--web`: page locale, ouverte dans le navigateur (`--no-open` pour imprimer seulement son
  URL). Un secret vide garde celui qui est sauvé.

Si un serveur fonctionne, il le dit : redémarrez-le pour récupérer les modifications. `--config <file>` (ou
`SIGNOZ_CONFIG`) écrit un autre fichier.

## `signoz mcp install`

Détecte chaque client en exécutant son `--version`, et enregistre le serveur stdio à travers le propre CLI du client,
sous le nom `signoz`:

| Client      | Commande qu'il exécute      |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

La commande enregistrée est : `node <package>/dist/mcp/cli.js` par chemin absolu, sans justificatif: le serveur lit le
fichier enregistré lorsque le client le lance (`SIGNOZ_CONFIG` est passé seulement lorsque `--config` Nomme un autre
fichier).

Chaque client trouvé commence à coché. Un qui a déjà `signoz` l'entrée est marquée `already installed, reinstalls` et le
remplace. Sans terminal interactif, `--client` est nécessaire (`claude`, `codex`, `opencode`; dans WSL aussi
`claude@windows`, `codex@windows`, `opencode@windows`), plus `--force` remplacer une entrée. `--dry-run` imprime les
commandes au lieu de les exécuter.

Les deux `install` et `uninstall` travailler sur la configuration au niveau utilisateur (global) de chaque client. Les
entrées projetées ne sont jamais touchées.

## `signoz mcp uninstall`

Liste les clients avec un `signoz` entrée, indiquant si elle est `stdio` ou `http`, et supprime toute entrée de ce nom:
`claude mcp remove -s user`, `codex mcp remove`et pour OpenCode (qui n'a pas `remove`) une modification de son fichier
de configuration global qui supprime seulement cette clé, en conservant les commentaires et la disposition.

C'est la seule commande en plus `signoz mcp config` qui fonctionne sans configuration sauvegardée, donc un client peut
être nettoyé après que la configuration est partie. `--client` et `--dry-run` travail `install`.

## `signoz mcp start`, `stop` et `status`

`start` exécute le serveur HTTP détaché, avec son pid et se connecter `<config dir>/run/`, et imprime son URL, son
fichier journal et le `claude mcp add` ligne pour l'enregistrer. Il faut une configuration sauvegardée. `--api-key`,
`--base-url`, `--env` et `--port` ne le remplace que pour cette course, et ne sont jamais sauvés. `--foreground` sert
plutôt dans le processus actuel.

`status` affiche si le serveur fonctionne, avec son URL, pid et uptime, et sort avec le code 3 quand il n'est pas.
`stop` demande au serveur de fermer à travers un jeton gardé `POST /shutdown`, et ne signale le processus que si cela
échoue.

## `signoz mcp boot`

`boot enable` installe un service de l'utilisateur actuel qui démarre le serveur à chaque connexion, donc aucun sudo
n'est nécessaire:

| OS       | Services                                                                       |
| -------- | ------------------------------------------------------------------------------ |
| Linux    | une unité utilisateur système (sur WSL, activer systèmed dans `/etc/wsl.conf`) |
| MACOS    | un Agent de lancement                                                          |
| Fenêtres | une tâche de logon                                                             |

Le service ne lit que la configuration enregistrée. `boot disable` le retire et `boot status` le signale.
