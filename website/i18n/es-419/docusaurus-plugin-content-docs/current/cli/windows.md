---
sidebar_position: 3
title: Windows y WSL
description: "Utilizando el CLI en Windows 10/11 de PowerShell o cmd, y registrando el servidor en clientes de Windows de WSL."
---

# Windows y WSL

El paquete funciona en Windows 10/11 con Node.js 20 o más tarde, desde PowerShell o cmd.

- El archivo de configuración vive en `%APPDATA%\signoz\.env`, protegido por los permisos por usuario de esa carpeta
  (los modos de archivo no significan nada en Windows).
- `signoz mcp boot enable` registra una tarea de logotipo.
- `signoz mcp stop` pide al servidor que se cierre a través de un token-guarded `POST /shutdown` antes de caer de nuevo
  para terminarlo: una señal en Windows es `TerminateProcess`, que no dejaría el servidor apagado.
- El cliente CLI se ejecuta `cross-spawn`, así que Windows `.cmd` Shims trabajo.
- Los archivos se escriben a través de un renombre que se repite, porque los antivirus y los editores mantienen los
  archivos abiertos.

## De WSL

Cuando el paquete se instala dentro de WSL, `signoz mcp install` y `uninstall` también lista los clientes instalados en
el lado Windows, como `Claude Code (Windows)` y así sucesivamente`--client claude@windows`). Empiezan el servidor con
`wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, así que sigue leyendo la configuración guardada dentro de WSL. La
primera llamada después de que WSL haya sido idle espera que la distro comience (una segunda o dos).

El lado de Windows se alcanza a través `powershell.exe`, tomado del PATH o, con `appendWindowsPath = false`, de
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`. Cuando no se puede alcanzar, `--client claude@windows` dice que paso
falló.

Para iniciar el servidor al iniciar sesión dentro de WSL, active sistematizado en `/etc/wsl.conf` primero, luego corre
`npx signoz mcp boot enable`.
