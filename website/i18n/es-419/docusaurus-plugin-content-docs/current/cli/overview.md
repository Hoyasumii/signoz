---
sidebar_position: 1
title: CLI Overview
description: "El comando signoz: cada herramienta MCP como subcommand, con el esquema de entrada de la herramienta como sus banderas."
---

# CLI

El paquete instala a `signoz` Comando. Es un cliente MCP del [mismo servidor](../mcp/overview.md): cada herramienta MCP
se convierte en un subcomando, y el esquema de entrada de la herramienta se convierte en sus banderas. Por defecto el
servidor se ejecuta dentro del comando, por lo que no hay nada que empezar primero.

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

Nada más que nada `--help`, `--version`, `signoz docs`, `signoz mcp config` y `signoz mcp uninstall` se ejecuta hasta
que se guarde una configuración con una URL y una credencial. `signoz docs` imprime el enlace a este sitio web y lo abre
en el navegador.

## De herramientas a comandos

- El comando es el nombre de la herramienta sin `signoz_`, en kebab-case: `signoz_search_logs` → `search-logs`.
- Cada bandera es una entrada en kebab-case: `traceId` → `--trace-id`, `errorsOnly` → `--errors-only`.
- Array flags take `a,b` o JSON, las banderas de objetos toman JSON, y las banderas booleanas no necesitan valor.
- `signoz <command> --help` lista las banderas de un comando, con los valores permitidos de entradas de enum.

La salida de la herramienta va a stdout. Un error de herramienta va a stderr con código de salida 1.

## Ajustes únicos y un servidor en funcionamiento

`--base-url`, `--api-key` y `--env` anular el medio ambiente y el archivo guardado para una ejecución del servidor en
proceso. Para usar un `signoz-mcp` que ya está corriendo sobre HTTP en lugar, pasar `--url http://127.0.0.1:3767/mcp` o
conjunto `SIGNOZ_MCP_URL`Estas banderas funcionan en cualquier lugar de la línea de comandos.

Ninguno de ellos se interpone en la configuración guardada: el CLI se niega a ejecutar herramientas sin ella, incluso
cuando `--url` o `--api-key` se da.

## Gestión del servidor

`signoz mcp` es interceptado antes de que se haga cualquier conexión. Configura el servidor, lo ejecuta en el fondo, lo
inicia en el login y lo registra en sus clientes MCP. See [`signoz mcp`](./mcp-commands.md).
