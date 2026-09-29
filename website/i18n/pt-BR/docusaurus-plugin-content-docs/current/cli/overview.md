---
sidebar_position: 1
title: Visão geral da CLI
description: "O comando signoz: cada ferramenta MCP como um subcomando, com o input schema da ferramenta como flags."
---

# CLI

O pacote instala um comando `signoz`. Ele é um cliente MCP do [mesmo servidor](../mcp/overview.md): cada ferramenta
MCP vira um subcomando, e o input schema da ferramenta vira suas flags. Por padrão o servidor roda dentro do comando,
então não há nada para iniciar antes.

```bash
npx signoz mcp config                          # uma vez: a URL da instância e uma API key (ou os tokens do navegador)
npx signoz tools                               # todos os comandos, um por ferramenta MCP
npx signoz whoami
npx signoz list-services --since 24h
npx signoz search-logs --service point-api --severity ERROR,FATAL --since 30m
npx signoz search-traces --service point-api --errors-only --min-duration-ms 500
npx signoz get-trace --trace-id 4bf92f3577b34da6a3ce929d0e0e4736
npx signoz resources --query "saved view"
npx signoz call --operation rules.listRules
```

Nada além de `--help`, `--version`, `signoz docs`, `signoz mcp config` e `signoz mcp uninstall` roda até que uma
configuração com URL e credencial esteja salva. `signoz docs` imprime o link deste site e o abre no navegador.

## De ferramentas para comandos

- O comando é o nome da ferramenta sem `signoz_`, em kebab-case: `signoz_search_logs` → `search-logs`.
- Cada flag é uma entrada em kebab-case: `traceId` → `--trace-id`, `errorsOnly` → `--errors-only`.
- Flags de array aceitam `a,b` ou JSON, flags de objeto aceitam JSON, e flags booleanas não precisam de valor.
- `signoz <comando> --help` lista as flags de um comando, com os valores permitidos das entradas enum.

A saída da ferramenta vai para o stdout. Um erro da ferramenta vai para o stderr com código de saída 1.

## Configurações avulsas e um servidor já rodando

`--base-url`, `--api-key` e `--env` sobrescrevem o ambiente e o arquivo salvo numa execução do servidor em processo.
Para usar um `signoz-mcp` que já roda por HTTP, passe `--url http://127.0.0.1:3767/mcp` ou defina `SIGNOZ_MCP_URL`.
Essas flags funcionam em qualquer posição da linha de comando.

Nenhuma delas substitui a configuração salva: a CLI se recusa a rodar ferramentas sem ela, mesmo com `--url` ou
`--api-key`.

## Gerenciando o servidor

`signoz mcp` é interceptado antes de qualquer conexão. Ele configura o servidor, o roda em segundo plano, o inicia no
login e o registra nos seus clientes MCP. Veja [`signoz mcp`](./mcp-commands.md).
