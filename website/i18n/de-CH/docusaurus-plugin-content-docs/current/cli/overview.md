---
sidebar_position: 1
title: CLI Überblick
description: "Der Befehl signoz: jedes MCP-Tool als Unterbefehl, mit dem Eingabeschema des Tools als Flags."
---

# CLI

Das Paket installiert eine `signoz` Kommando. Es ist ein MCP-Client des [Der gleiche Server](../mcp/overview.md)Jedes
MCP-Tool wird zu einem Unterbefehl und das Eingabeschema des Tools wird zu seinen Flags. Standardmäßig läuft der Server
innerhalb des Befehls, so dass nichts zuerst gestartet werden muss.

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

Nichts als `--help`, `--version`, `signoz docs`, `signoz mcp config` und `signoz mcp uninstall` läuft, bis eine
Konfiguration mit einer URL und einem Berechtigungsnachweis gespeichert ist. `signoz docs` druckt den Link zu dieser
Website aus und öffnet ihn im Browser.

## Von Werkzeugen zu Befehlen

- Der Befehl ist der Name des Tools ohne `signoz_`, im Kebab-Fall: `signoz_search_logs` → `search-logs`.
- Jedes Flag ist eine Eingabe im Kebab-Fall: `traceId` → `--trace-id`, `errorsOnly` → `--errors-only`.
- Array Flags nehmen `a,b` oder JSON, Objekt-Flags nehmen JSON und boolesche Flags brauchen keinen Wert.
- `signoz <command> --help` listet die Flags eines Kommandos mit den zulässigen Werten der Enum-Eingaben auf.

Die Werkzeugausgabe geht auf stdout. Ein Tool Error geht an Stderr mit Exit Code 1.

## Einmalige Einstellungen und ein laufender Server

`--base-url`, `--api-key` und `--env` Überschreiben Sie die Umgebung und die gespeicherte Datei für einen Lauf des
In-Prozess-Servers. Zu verwenden a `signoz-mcp` das stattdessen bereits über HTTP läuft, pass
`--url http://127.0.0.1:3767/mcp` oder eingestellt `SIGNOZ_MCP_URL`Diese Flags funktionieren überall in der
Kommandozeile.

Keiner von ihnen steht für die gespeicherte Konfiguration: Die CLI weigert sich, Werkzeuge ohne sie auszuführen, auch
wenn `--url` oder `--api-key` gegeben ist.

## Verwalten des Servers

`signoz mcp` abgefangen wird, bevor eine Verbindung hergestellt wird. Es konfiguriert den Server, führt ihn im
Hintergrund aus, startet ihn beim Login und registriert ihn in Ihren MCP-Clients. Siehe
[`signoz mcp`](./mcp-commands.md).
