---
sidebar_position: 3
title: Windows et WSL
description: "Utilisation du CLI sur Windows 10/11 de PowerShell ou cmd, et enregistrement du serveur dans les clients Windows de WSL."
---

# Windows et WSL

Le paquet fonctionne avec Windows 10/11 avec Node.js 20 ou plus, de PowerShell ou cmd.

- Le fichier de paramètres vit dans `%APPDATA%\signoz\.env`, protégé par les permissions par utilisateur de ce dossier
  (les modes de fichier ne signifient rien sur Windows).
- `signoz mcp boot enable` enregistre une tâche de connexion.
- `signoz mcp stop` demande au serveur de fermer à travers un jeton gardé `POST /shutdown` avant de revenir à la fin :
  un signal sur Windows est `TerminateProcess`, qui ne laisserait pas le serveur s'arrêter.
- Les CLI clients sont passés par `cross-spawn`, donc Windows `.cmd` Ça marche.
- Les fichiers sont écrits par le biais d'un renom qui retries, car antivirus et éditeurs tiennent les fichiers ouverts.

## De WSL

Lorsque le paquet est installé dans WSL, `signoz mcp install` et `uninstall` liste également les clients installés sur
le côté Windows, comme `Claude Code (Windows)` et ainsi de suite (`--client claude@windows`) . Ils démarrent le serveur
avec `wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, donc il continue à lire la configuration enregistrée dans WSL. Le
premier appel après que WSL ait été inactif attend que la distribution commence (une seconde ou deux).

Le côté Windows est atteint par `powershell.exe`, pris du PATH ou, avec `appendWindowsPath = false`, de
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`. Quand il ne peut pas être atteint, `--client claude@windows` dit
quelle étape a échoué.

Pour démarrer le serveur à l'intérieur de WSL, activez systèmed in `/etc/wsl.conf` d'abord, puis lancez
`npx signoz mcp boot enable`.
