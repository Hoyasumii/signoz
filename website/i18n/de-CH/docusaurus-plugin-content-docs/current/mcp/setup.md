---
sidebar_position: 2
title: Einrichtung
description: "Speichern Sie Ihre Einstellungen einmalig und registrieren Sie SigNoz MCP-Server in Claude Code, Codex und OpenCode."
---

# Einrichtung

## Der schnelle Weg

Speichern Sie Ihre Einstellungen einmal und lassen Sie die CLI den Server in den Clients registrieren, die sie findet:

```bash
npx signoz mcp config    # asks for the instance URL, an API key (or the browser tokens), an environment and a port
npx signoz mcp install   # finds Claude Code, Codex and OpenCode on your PATH and registers signoz-mcp (stdio)
```

`install` zeigt eine Checkliste der gefundenen Clients. Wählen Sie diejenigen, die Sie wollen, und es registriert den
Server über jeden Client eigenen CLI, unter dem Namen `signoz`. Der registrierte Befehl liest die gespeicherte
Konfiguration, wenn der Client sie startet, so dass keine Anmeldeinformationen in der Client-Konfiguration landen. Siehe
[`signoz mcp install`](../cli/mcp-commands.md#signoz-mcp-install) für die Flaggen.

## Handschrift: stdio

Lassen Sie den Client starten `signoz-mcp`Es liest die gespeicherte Konfiguration, so dass die Client-Konfiguration
keine Schlüssel benötigt:

```json
{
  "mcpServers": {
    "signoz": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/signoz", "signoz-mcp"] }
  }
}
```

In Claude Code:

```bash
claude mcp add signoz -- npx -y -p @hoyasumii/signoz signoz-mcp
```

Ohne eine gespeicherte Konfiguration oder um sie zu überschreiben, geben Sie dem Client eine `env` Block mit
`SIGNOZ_BASE_URL` und `SIGNOZ_API_KEY` (siehe) [Konfiguration](./configuration.md):

```json
{
  "mcpServers": {
    "signoz": {
      "command": "npx",
      "args": ["-y", "-p", "@hoyasumii/signoz", "signoz-mcp"],
      "env": { "SIGNOZ_BASE_URL": "https://signoz.example.com", "SIGNOZ_API_KEY": "your-api-key" }
    }
  }
}
```

## Von Hand: HTTP

Führen Sie einen Server im Hintergrund aus und zeigen Sie Ihre Clients auf die URL:

```bash
npx signoz mcp start          # prints the URL, http://127.0.0.1:3767/mcp by default
claude mcp add --transport http signoz http://127.0.0.1:3767/mcp
```

Ohne die CLI, `signoz-mcp --http` führt es im Vordergrund mit den Einstellungen aus der Umgebung oder der gespeicherten
Konfiguration aus. `signoz-mcp --help` Liste der Flaggen. Um den Server bei jedem Login zu starten, laufen
`npx signoz mcp boot enable` (siehe) [`signoz mcp boot`](../cli/mcp-commands.md#signoz-mcp-boot).

## Überprüfen, dass es funktioniert

Bitten Sie Ihren Agenten, anzurufen `signoz_whoami`, oder führen Sie es vom Terminal aus:

```bash
npx signoz whoami
```

Es beantwortet die Instanz-URL, den Auth-Modus, das Benutzer- oder Dienstkonto, die SigNoz Version der SDK-Spiegel und
der Standardumgebung.
