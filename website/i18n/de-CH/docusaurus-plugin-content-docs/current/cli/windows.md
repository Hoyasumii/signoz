---
sidebar_position: 3
title: Windows und WSL
description: "Verwenden der CLI unter Windows 10/11 von PowerShell oder cmd und Registrieren des Servers in Windows-Clients von WSL."
---

# Windows und WSL

Das Paket läuft unter Windows 10/11 mit Node.js 20 oder höher, von PowerShell oder cmd.

- Die Einstellungsdatei lebt in `%APPDATA%\signoz\.env`, geschützt durch die Berechtigungen dieses Ordners pro Benutzer
  (Dateimodi bedeuten unter Windows nichts).
- `signoz mcp boot enable` Registriert eine Anmeldeaufgabe.
- `signoz mcp stop` fordert den Server auf, durch einen Token-geschützten herunterzufahren `POST /shutdown` bevor Sie
  auf das Beenden zurückgreifen: Ein Signal unter Windows ist `TerminateProcess`Dies würde den Server nicht
  herunterfahren lassen.
- Die Client-CLIs werden durch `cross-spawn`, also Windows `.cmd` Shims arbeiten.
- Dateien werden durch einen Rename geschrieben, der wiederholt wird, da Antivirus und Editoren Dateien offen halten.

## Von WSL

Wenn das Paket innerhalb von WSL installiert ist, `signoz mcp install` und `uninstall` Liste auch die Clients auf der
Windows-Seite installiert, wie `Claude Code (Windows)` und so weiter ()`--client claude@windows`. Sie starten den Server
mit `wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, so dass es die in WSL gespeicherte Konfiguration weiter liest. Der
erste Anruf, nachdem WSL im Leerlauf war, wartet auf den Start der Distribution (ein oder zwei Sekunden).

Die Windows-Seite wird erreicht durch `powershell.exe`, entnommen aus dem Weg oder mit `appendWindowsPath = false`, aus
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`Wenn es nicht erreicht werden kann, `--client claude@windows` Sagt,
welcher Schritt gescheitert ist.

Um den Server beim Login innerhalb von WSL zu starten, aktivieren Sie systemd in `/etc/wsl.conf` zuerst, dann laufen
`npx signoz mcp boot enable`.
