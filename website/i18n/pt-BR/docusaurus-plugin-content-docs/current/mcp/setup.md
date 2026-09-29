---
sidebar_position: 2
title: Configuração inicial
description: "Salve suas configurações uma vez e registre o servidor MCP do SigNoz no Claude Code, no Codex e no OpenCode."
---

# Configuração inicial

## O jeito rápido

Salve suas configurações uma vez e deixe a CLI registrar o servidor nos clientes que encontrar:

```bash
npx signoz mcp config    # pede a URL da instância, uma API key (ou os tokens do navegador), um ambiente e uma porta
npx signoz mcp install   # encontra Claude Code, Codex e OpenCode no PATH e registra o signoz-mcp (stdio)
```

`install` mostra uma lista dos clientes encontrados. Marque os que quiser e ele registra o servidor pela CLI de cada
cliente, com o nome `signoz`. O comando registrado lê a configuração salva quando o cliente o inicia, então nenhuma
credencial vai parar na configuração do cliente. Veja [`signoz mcp install`](../cli/mcp-commands.md#signoz-mcp-install)
para as flags.

## À mão: stdio

Deixe o cliente iniciar o `signoz-mcp`. Ele lê a configuração salva, então a configuração do cliente não precisa de
chaves:

```json
{
  "mcpServers": {
    "signoz": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/signoz", "signoz-mcp"] }
  }
}
```

No Claude Code:

```bash
claude mcp add signoz -- npx -y -p @hoyasumii/signoz signoz-mcp
```

Sem uma configuração salva, ou para sobrescrevê-la, dê ao cliente um bloco `env` com `SIGNOZ_BASE_URL` e
`SIGNOZ_API_KEY` (veja [Configuração](./configuration.md)):

```json
{
  "mcpServers": {
    "signoz": {
      "command": "npx",
      "args": ["-y", "-p", "@hoyasumii/signoz", "signoz-mcp"],
      "env": { "SIGNOZ_BASE_URL": "https://signoz.example.com", "SIGNOZ_API_KEY": "sua-api-key" }
    }
  }
}
```

## À mão: HTTP

Rode um servidor em segundo plano e aponte seus clientes para a URL dele:

```bash
npx signoz mcp start          # imprime a URL, http://127.0.0.1:3767/mcp por padrão
claude mcp add --transport http signoz http://127.0.0.1:3767/mcp
```

Sem a CLI, `signoz-mcp --http` o roda em primeiro plano com as configurações do ambiente ou da configuração salva.
`signoz-mcp --help` lista as flags. Para iniciar o servidor a cada login, rode `npx signoz mcp boot enable` (veja
[`signoz mcp boot`](../cli/mcp-commands.md#signoz-mcp-boot)).

## Conferindo que funciona

Peça ao seu agente para chamar `signoz_whoami`, ou rode no terminal:

```bash
npx signoz whoami
```

Ele responde a URL da instância, o modo de autenticação, o usuário ou service account, a versão do SigNoz que o SDK
espelha e o ambiente padrão.
