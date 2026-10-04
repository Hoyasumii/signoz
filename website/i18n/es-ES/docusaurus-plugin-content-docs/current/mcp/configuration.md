---
sidebar_position: 7
title: Configuración
description: "Los ajustes que el servidor y el CLI leen, donde se guardan, y el orden en el que se resuelven."
---

# Configuración

Cada configuración viene de una bandera, luego el ambiente, luego el archivo `signoz mcp config` guardado, entonces el
predeterminado.

| Variable                    | ¿Para qué?                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `SIGNOZ_BASE_URL`           | La URL de instancia                                                                    |
| `SIGNOZ_API_KEY`            | Una cuenta de servicio API clave                                                       |
| `SIGNOZ_AUTH_TOKEN`         | Con `SIGNOZ_REFRESH_AUTH_TOKEN`: la sesión del navegador, en lugar de una clave de API |
| `SIGNOZ_REFRESH_AUTH_TOKEN` | El token refrescante de la sesión                                                      |
| `SIGNOZ_ENV`                | El `deployment.environment` las herramientas de telemetría filtran por defecto         |
| `PORT`                      | El puerto HTTP (predeterminado 3767)                                                   |
| `SIGNOZ_CONFIG`             | Donde vive la configuración guardada (también `--config`)                              |

Cuando se establece una clave API y un par de token, la clave API gana. See [Autenticación](../sdk/authentication.md)
por donde viene cada uno.

## Donde se salva

- `~/.config/signoz/.env` en Linux;
- `~/Library/Application Support/signoz/.env` en macOS;
- `%APPDATA%\signoz\.env` en Windows;
- o donde quiera `SIGNOZ_CONFIG`/`--config` puntos.

El archivo está escrito con el modo 0600 (en Windows la carpeta ACL lo protege). Con las fichas del navegador, el par
girado va a `session.json` al lado del `.env`, compartido por stdio, el daemon y el CLI.

Los secretos nunca aparecen en errores, registros, `--help` o el formulario de configuración.
