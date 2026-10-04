---
sidebar_position: 7
title: Configuration
description: "Les paramètres du serveur et du CLI lisent, où ils sont enregistrés, et l'ordre dans lequel ils sont résolus."
---

# Configuration

Chaque réglage provient d'un drapeau, puis de l'environnement, puis du fichier `signoz mcp config` sauvé, puis par
défaut.

| Variable                    | Pourquoi                                                                          |
| --------------------------- | --------------------------------------------------------------------------------- |
| `SIGNOZ_BASE_URL`           | URL de l'instance                                                                 |
| `SIGNOZ_API_KEY`            | Une clé API de compte de service                                                  |
| `SIGNOZ_AUTH_TOKEN`         | Avec `SIGNOZ_REFRESH_AUTH_TOKEN`: la session du navigateur, au lieu d'une clé API |
| `SIGNOZ_REFRESH_AUTH_TOKEN` | La séance est rafraîchissante                                                     |
| `SIGNOZ_ENV`                | Les `deployment.environment` les outils de télémétrie filtrent par défaut         |
| `PORT`                      | Le port HTTP (par défaut 3767)                                                    |
| `SIGNOZ_CONFIG`             | Où la configuration sauvée vit (aussi `--config`)                                 |

Quand une clé API et une paire de jetons sont définis, la clé API gagne. Voir
[Authentification](../sdk/authentication.md) d'où chacun vient.

## Où il est sauvé

- `~/.config/signoz/.env` sur Linux;
- `~/Library/Application Support/signoz/.env` sur macOS;
- `%APPDATA%\signoz\.env` sous Windows;
- ou où que ce soit `SIGNOZ_CONFIG`/`--config` et des points.

Le fichier est écrit en mode 0600 (sur Windows l'ACL du dossier le protège). Avec les jetons de navigateur, la paire
tournante va à `session.json` à côté du `.env`, partagée par Stdio, le démon et le CLI.

Les secrets ne se présentent jamais dans les erreurs, les journaux, `--help` ou le formulaire de configuration.
