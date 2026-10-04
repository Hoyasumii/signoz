---
sidebar_position: 2
title: Signoz mcp
description: "signoz mcp: Speichern Sie die Konfiguration, führen Sie den Server im Hintergrund aus, starten Sie ihn bei der Anmeldung und registrieren Sie ihn in Ihren MCP-Clients."
---

# `signoz mcp`

`signoz mcp` Verwaltet den MCP-Server für Sie: seine gespeicherte Konfiguration, einen HTTP-Hintergrundserver, einen
Anmeldedienst und seine Registrierung in Ihren MCP-Clients.

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

Schreibt das Gerettete `.env` ()[Konfiguration](../mcp/configuration.md). Es funktioniert auf drei Arten:

- **Im Terminal** (Ausfall). Es fragt nach jeder Einstellung, beginnend mit den gespeicherten Werten. Geheimnisse werden
  maskiert getippt: Enter hält den Geretteten und `-` löscht es.
- **Mit Flaggen.** In einer `--base-url`, `--api-key`, `--auth-token`, `--refresh-auth-token`, `--env` oder `--port`Es
  fragt nichts und rettet nur diese. Ohne Terminal braucht es sie. Ein Geheimnis, das als Flagge in Ihrer
  Shell-Geschichte verbleibt, also bevorzugen Sie die Aufforderung dafür.
- **in einem Webformular** mit `--web`: eine lokale Seite, die im Browser geöffnet wird (`--no-open` nur die URL zu
  drucken. Ein leeres Geheimnis bewahrt das Gerettete.

Wenn ein Server läuft, heißt es so: Starten Sie ihn neu, um die Änderungen aufzunehmen. `--config <file>` oder
`SIGNOZ_CONFIG`) schreibt eine andere Datei.

## `signoz mcp install`

Erkennt jeden Client, indem er seine `--version`, und registriert den Stdio-Server über die Client-eigene CLI, unter dem
Namen `signoz`:

| Kunde       | Command It Run              |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

Der registrierte Befehl ist `node <package>/dist/mcp/cli.js` durch den absoluten Pfad, ohne Anmeldeinformationen: Der
Server liest die gespeicherte Datei, wenn der Client sie startet ()`SIGNOZ_CONFIG` wird nur angenommen, wenn `--config`
benennt eine andere Datei.

Jeder gefundene Kunde beginnt zu ticken. Eine, die bereits eine `signoz` Eintrag ist gekennzeichnet
`already installed, reinstalls` und wird ersetzt. Ohne interaktives Terminal, `--client` ist erforderlich ()`claude`,
`codex`, `opencode`auch innerhalb der WSL `claude@windows`, `codex@windows`, `opencode@windows`, plus `--force` einen
Eintrag zu ersetzen. `--dry-run` druckt die Befehle, anstatt sie auszuführen.

Beide `install` und `uninstall` Arbeiten Sie an der (globalen) Konfiguration auf Benutzerebene jedes Kunden.
Projekt-scoped Einträge werden nie berührt.

## `signoz mcp uninstall`

Listen die Kunden mit einem `signoz` Eingabe, zeigt an, ob es `stdio` oder `http`, und entfernt jeden Eintrag dieses
Namens: `claude mcp remove -s user`, `codex mcp remove`, und für OpenCode (der keine `remove`) eine Bearbeitung seiner
globalen Konfigurationsdatei, die nur diesen Schlüssel löscht und Kommentare und Layout speichert.

Es ist ein einziger Befehl außer `signoz mcp config` das ohne gespeicherte Konfiguration läuft, sodass ein Client nach
dem Wegfall der Konfiguration bereinigt werden kann. `--client` und `--dry-run` Arbeiten wie in `install`.

## `signoz mcp start`, `stop` und `status`

`start` führt den HTTP-Server losgelöst aus, mit seinem Pid und Login `<config dir>/run/`, und druckt seine URL, seine
Protokolldatei und die `claude mcp add` Zeile, um es zu registrieren. Es braucht eine gespeicherte Konfiguration.
`--api-key`, `--base-url`, `--env` und `--port` Überschreiben Sie es nur für diesen Lauf und werden nie gerettet.
`--foreground` dient stattdessen im aktuellen Prozess.

`status` Druckt mit URL, Pid und Uptime aus, ob der Server läuft, und beendet mit Code 3, wenn dies nicht der Fall ist.
`stop` fordert den Server auf, durch einen Token-geschützten herunterzufahren `POST /shutdown`und signalisiert den
Prozess nur, wenn dieser fehlschlägt.

## `signoz mcp boot`

`boot enable` installiert einen Dienst des aktuellen Benutzers, der den Server bei jedem Login startet, so dass kein
sudo benötigt wird:

| OS      | Dienst                                                                   |
| ------- | ------------------------------------------------------------------------ |
| Linux   | eine Systemd User Unit (auf WSL, systemd in aktivieren) `/etc/wsl.conf`) |
| macOS   | a LaunchAgent                                                            |
| Windows | eine Anmeldeaufgabe                                                      |

Der Dienst liest nur die gespeicherte Konfiguration. `boot disable` entfernt und `boot status` berichtet.
