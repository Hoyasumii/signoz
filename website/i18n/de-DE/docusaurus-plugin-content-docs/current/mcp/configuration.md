---
sidebar_position: 7
title: Konfiguration
description: "Die Einstellungen, die der Server und die CLI lesen, wo sie gespeichert sind, und die Reihenfolge, in der sie aufgelöst werden."
---

# Konfiguration

Jede Einstellung kommt von einem Flag, dann die Umgebung, dann die Datei `signoz mcp config` Gespeichert, dann der
Default.

| Variabel                    | Was ist                                                                          |
| --------------------------- | -------------------------------------------------------------------------------- |
| `SIGNOZ_BASE_URL`           | Die Instanz URL                                                                  |
| `SIGNOZ_API_KEY`            | Ein Service Account API Key                                                      |
| `SIGNOZ_AUTH_TOKEN`         | mit `SIGNOZ_REFRESH_AUTH_TOKEN`Die Browser-Sitzung anstelle eines API-Schlüssels |
| `SIGNOZ_REFRESH_AUTH_TOKEN` | Das Refresh-Token der Session                                                    |
| `SIGNOZ_ENV`                | Die `deployment.environment` Die Telemetrie-Tools filtern standardmäßig ein      |
| `PORT`                      | Der HTTP-Port (Standard 3767)                                                    |
| `SIGNOZ_CONFIG`             | Wo die gespeicherte Konfiguration lebt (auch) `--config`)                        |

Wenn sowohl ein API-Schlüssel als auch ein Token-Paar gesetzt sind, gewinnt der API-Schlüssel. Siehe
[Authentifizierung](../sdk/authentication.md) Woher jeder kommt.

## Wo es gerettet wird

- `~/.config/signoz/.env` auf Linux;
- `~/Library/Application Support/signoz/.env` auf macOS;
- `%APPDATA%\signoz\.env` unter Windows;
- oder wo auch immer `SIGNOZ_CONFIG`/`--config` Punkte.

Die Datei wird im Modus 0600 geschrieben (unter Windows schützt die ACL des Ordners sie). Mit den Browser-Token geht das
gedrehte Paar zu `session.json` Neben dem `.env`, geteilt von stdio, dem Daemon und dem CLI.

Geheimnisse zeigen sich nie in Fehlern, Logs, `--help` oder das Konfigurationsformular.
