---
sidebar_position: 2
title: Configurar
description: "Salve suas configurações uma vez e registre o SigNoz Servidor MCP em Claude Code, Codex e OpenCode."
---

# Configurar

## A maneira rápida

Salve suas configurações uma vez e, em seguida, deixe o CLI registrar o servidor nos clientes que ele encontra:

```bash
npx signoz mcp config    # asks for the instance URL, an API key (or the browser tokens), an environment and a port
npx signoz mcp install   # finds Claude Code, Codex and OpenCode on your PATH and registers signoz-mcp (stdio)
```

`install` mostra uma lista de verificação dos clientes que encontrou. Assinale os que desejar e regista o servidor
através do CLI de cada cliente, sob o nome `signoz`O comando registrado lê a configuração salva quando o cliente a
lança, então nenhuma credencial acaba na configuração do cliente. Ver
[`signoz mcp install`](../cli/mcp-commands.md#signoz-mcp-install) para as bandeiras.

## À mão: stdio

Deixar o cliente começar `signoz-mcp`. Ele lê a configuração salva, então a configuração do cliente não precisa de
chaves:

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

Sem uma configuração salva, ou para substituí-la, dê ao cliente uma `env` bloquear com `SIGNOZ_BASE_URL` e
`SIGNOZ_API_KEY` (ver [Configuração](./configuration.md)):

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

## À mão: HTTP

Execute um servidor em segundo plano e aponte seus clientes para sua URL:

```bash
npx signoz mcp start          # prints the URL, http://127.0.0.1:3767/mcp by default
claude mcp add --transport http signoz http://127.0.0.1:3767/mcp
```

Sem o CLI, `signoz-mcp --http` executa- o em primeiro plano com as configurações do ambiente ou da configuração salva.
`signoz-mcp --help` lista as bandeiras. Para iniciar o servidor em cada login, execute `npx signoz mcp boot enable` (ver
[`signoz mcp boot`](../cli/mcp-commands.md#signoz-mcp-boot)).

## Verificando se funciona

Peça ao seu agente para ligar `signoz_whoami`, ou executá-lo a partir do terminal:

```bash
npx signoz whoami
```

Responde à URL da instância, ao modo de autenticação, à conta de utilizador ou de serviço, SigNoz version os espelhos
SDK e o ambiente padrão.
