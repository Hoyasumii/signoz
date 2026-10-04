---
sidebar_position: 1
title: Visão geral do CLI
description: "O comando signoz: cada ferramenta MCP como subcomando, com o esquema de entrada da ferramenta como sinalizadores."
---

# CLI

O pacote instala um `signoz` Comando. É um cliente MCP da [mesmo servidor](../mcp/overview.md): cada ferramenta MCP se
torna um subcomando, e o esquema de entrada da ferramenta torna-se suas bandeiras. Por padrão, o servidor é executado
dentro do comando, então não há nada para começar primeiro.

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

Nada além de... `--help`, `--version`, `signoz docs`, `signoz mcp config` e `signoz mcp uninstall` roda até que uma
configuração com um URL e uma credencial seja salva. `signoz docs` imprime o link para este site e o abre no navegador.

## De ferramentas para comandos

- O comando é o nome da ferramenta sem `signoz_`, em caso de kebab: `signoz_search_logs` → `search-logs`.
- Cada bandeira é uma entrada no caso kebab: `traceId` → `--trace-id`, `errorsOnly` → `--errors-only`.
- Array bandeiras tomar `a,b` ou JSON, bandeiras de objetos tomam JSON, e bandeiras booleanas não precisam de valor.
- `signoz <command> --help` lista as bandeiras de um comando, com os valores permitidos de entradas de enum.

A saída da ferramenta vai para stdout. Um erro de ferramenta vai para o stderr com código de saída 1.

## Configuração única e um servidor em execução

`--base-url`, `--api-key` e `--env` sobrepor o ambiente e o arquivo salvo para uma execução do servidor em processo.
Para usar um `signoz-mcp` que já está rodando sobre HTTP, passe `--url http://127.0.0.1:3767/mcp` ou definido
`SIGNOZ_MCP_URL`Estas bandeiras funcionam em qualquer lugar na linha de comando.

Nenhum deles representa a configuração salva: o CLI se recusa a executar ferramentas sem ela, mesmo quando `--url` ou
`--api-key` é administrado.

## Gerenciando o servidor

`signoz mcp` é interceptado antes de qualquer ligação ser feita. Ele configura o servidor, executa-o em segundo plano,
inicia-o no login e registra-o em seus clientes MCP. Ver [`signoz mcp`](./mcp-commands.md).
