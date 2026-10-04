---
sidebar_position: 2
title: signoz mcp
description: "signoz mcp: guardar la configuración, ejecutar el servidor en el fondo, iniciarlo en el login y registrarlo en sus clientes MCP."
---

# `signoz mcp`

`signoz mcp` gestiona el servidor MCP para usted: su configuración guardada, un servidor HTTP de fondo, un servicio de
login y su registro en sus clientes MCP.

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

Escribe lo salvado `.env` (G)[Configuración](../mcp/configuration.md)). Funciona de tres maneras:

- **En la terminal** (el predeterminado). Pide cada ajuste a su vez, comenzando por los valores salvados. Los secretos
  se escriben enmascarados: entrar mantiene al salvado, y `-` lo aclara.
- **Con banderas.** Dado cualquiera `--base-url`, `--api-key`, `--auth-token`, `--refresh-auth-token`, `--env` o
  `--port`No pide nada y salva sólo eso. Sin terminal, los necesita. Un secreto pasó mientras una bandera permanece en
  su historia de la concha, así que prefiera el aviso para ello.
- **En una forma web** con `--web`: una página local, abierta en el navegador (`--no-open` para imprimir solamente su
  URL). Un secreto en blanco mantiene al salvado.

Si un servidor está funcionando, lo dice: reiniciarlo para recoger los cambios. `--config <file>` (o `SIGNOZ_CONFIG`)
escribe otro archivo.

## `signoz mcp install`

Detecta a cada cliente ejecutando su `--version`, y registra el servidor stdio a través del propio CLI del cliente, bajo
el nombre `signoz`:

| Cliente     | Mando que funciona          |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

El comando registrado es `node <package>/dist/mcp/cli.js` por la ruta absoluta, sin credencial: el servidor lee el
archivo guardado cuando el cliente lo lanza (`SIGNOZ_CONFIG` se pasa sólo cuando `--config` nombre otro archivo).

Cada cliente encontrado comienza cosquillas. Uno que ya tiene un `signoz` entrada marcada
`already installed, reinstalls` y lo reemplaza. Sin un terminal interactivo, `--client` es necesario (`claude`, `codex`,
`opencode`; dentro de WSL también `claude@windows`, `codex@windows`, `opencode@windows`), más `--force` para reemplazar
una entrada. `--dry-run` imprime los comandos en lugar de ejecutarlos.

Ambos `install` y `uninstall` trabajar en el configuración de cada cliente (global). Las entradas del proyecto no se
tocan nunca.

## `signoz mcp uninstall`

Lista a los clientes con un `signoz` entrada, mostrando si es `stdio` o `http`, y elimina cualquier entrada de ese
nombre: `claude mcp remove -s user`, `codex mcp remove`, y OpenCode (que no tiene `remove`) una edición de su archivo de
configuración global que elimina sólo esa clave, manteniendo comentarios y diseño.

Es el único comando además `signoz mcp config` que funciona sin una configuración guardada, por lo que un cliente puede
ser limpiado después de que la configuración se haya ido. `--client` y `--dry-run` como en el trabajo `install`.

## `signoz mcp start`, `stop` y `status`

`start` ejecuta el servidor HTTP desprendido, con su pid y registro en `<config dir>/run/`, e imprime su URL, su archivo
de registro y el `claude mcp add` línea para registrarla. Necesita una configuración guardada. `--api-key`,
`--base-url`, `--env` y `--port` anularlo sólo para esta carrera, y nunca se salvan. `--foreground` sirve en el proceso
actual en su lugar.

`status` imprime si el servidor está funcionando, con su URL, pid y tiempo de inactividad, y sale con el código 3 cuando
no lo es. `stop` pide al servidor que se cierre a través de un token-guarded `POST /shutdown`, y señala el proceso sólo
si eso falla.

## `signoz mcp boot`

`boot enable` instala un servicio del usuario actual que inicia el servidor en cada login, por lo que no se necesita
sudo:

| OS      | Servicio                                                                                 |
| ------- | ---------------------------------------------------------------------------------------- |
| Linux   | una unidad de usuario sistematizada (en WSL, habilitar sistematizado en `/etc/wsl.conf`) |
| macOS   | a LaunchAgent                                                                            |
| Windows | logon task                                                                               |

El servicio sólo lee la configuración guardada. `boot disable` lo quita y `boot status` lo reporta.
