---
sidebar_position: 2
title: Configuración
description: "Guarde su configuración una vez y registre SigNoz Servidor MCP en Claude Code, Codex y OpenCode."
---

# Configuración

## El camino rápido

Guarda tus ajustes una vez, deja que el CLI registre el servidor en los clientes que encuentre:

```bash
npx signoz mcp config    # asks for the instance URL, an API key (or the browser tokens), an environment and a port
npx signoz mcp install   # finds Claude Code, Codex and OpenCode on your PATH and registers signoz-mcp (stdio)
```

`install` muestra una lista de clientes que encontró. Ataque los que quieras, y registra el servidor a través del propio
CLI de cada cliente, bajo el nombre `signoz`. El comando registrado lee la configuración guardada cuando el cliente la
lanza, por lo que ninguna credencial termina en el config del cliente. See
[`signoz mcp install`](../cli/mcp-commands.md#signoz-mcp-install) para las banderas.

## A mano: stdio

Deja que el cliente empiece `signoz-mcp`. Lee la configuración guardada, por lo que el config cliente no necesita
claves:

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

Sin una configuración guardada, o para anularla, da al cliente un `env` bloque con `SIGNOZ_BASE_URL` y `SIGNOZ_API_KEY`
(ver [Configuración](./configuration.md)):

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

## A mano: HTTP

Ejecutar un servidor en el fondo y señalar a sus clientes en su URL:

```bash
npx signoz mcp start          # prints the URL, http://127.0.0.1:3767/mcp by default
claude mcp add --transport http signoz http://127.0.0.1:3767/mcp
```

Sin el CLI, `signoz-mcp --http` lo ejecuta en primer plano con la configuración del entorno o la configuración guardada.
`signoz-mcp --help` lista las banderas. Para iniciar el servidor en cada login, ejecutar `npx signoz mcp boot enable`
(ver [`signoz mcp boot`](../cli/mcp-commands.md#signoz-mcp-boot)).

## Comprobando que funciona

Pide a tu agente que llame `signoz_whoami`, o ejecutarlo desde el terminal:

```bash
npx signoz whoami
```

Responde a la URL de instancia, el modo auth, el usuario o la cuenta de servicio, SigNoz versión los espejos SDK y el
entorno predeterminado.
