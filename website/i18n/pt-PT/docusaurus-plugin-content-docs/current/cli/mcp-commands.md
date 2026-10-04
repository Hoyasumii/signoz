---
sidebar_position: 2
title: signoz mcp
description: "signoz mcp: salve a configuração, execute o servidor em segundo plano, inicie-o no login e registre-o em seus clientes MCP."
---

# `signoz mcp`

`signoz mcp` gerencia o servidor MCP para você: sua configuração salva, um servidor HTTP de fundo, um serviço de login e
seu registro em seus clientes MCP.

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

Grava o gravado `.env` ([Configuração](../mcp/configuration.md)). Funciona de três maneiras:

- **No terminal** (o padrão). Ele pede para cada configuração por sua vez, começando a partir dos valores salvos.
  Segredos são digitados mascarados: enter mantém o salvo, e `-` Limpa.
- **Com bandeiras.** Dado qualquer um dos `--base-url`, `--api-key`, `--auth-token`, `--refresh-auth-token`, `--env` ou
  `--port`, não pede nada e salva apenas aqueles. Sem um terminal, precisa deles. Um segredo passado como uma bandeira
  permanece em seu histórico shell, então prefira o prompt para ele.
- **Em formato web** com `--web`: uma página local, aberta no navegador (`--no-open` para imprimir apenas o seu URL). Um
  segredo em branco mantém o salvo.

Se um servidor estiver em execução, ele diz: reinicie-o para pegar as alterações. `--config <file>` (ou `SIGNOZ_CONFIG`)
escreve outro arquivo.

## `signoz mcp install`

Detecta cada cliente executando o seu `--version`, e registra o servidor stdio através do próprio CLI do cliente, sob o
nome `signoz`:

| Cliente     | Comando que executa         |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

O comando registado é `node <package>/dist/mcp/cli.js` por caminho absoluto, sem credencial: o servidor lê o arquivo
salvo quando o cliente o lança (`SIGNOZ_CONFIG` é passado apenas quando `--config` nomeia outro arquivo).

Todos os clientes encontrados começam a funcionar. Um que já tem um `signoz` a entrada está marcada
`already installed, reinstalls` e vai substituí-lo. Sem um terminal interactivo, `--client` é necessário (`claude`,
`codex`, `opencode`; dentro da WSL também `claude@windows`, `codex@windows`, `opencode@windows`), mais `--force` para
substituir uma entrada. `--dry-run` imprime os comandos em vez de executá-los.

Ambos `install` e `uninstall` trabalhar na configuração de cada cliente em nível de usuário (global). Entradas de
projeto nunca são tocadas.

## `signoz mcp uninstall`

Lista os clientes com `signoz` entrada, mostrando se é `stdio` ou `http`, e remove qualquer entrada desse nome:
`claude mcp remove -s user`, `codex mcp remove`, e OpenCode (que não tem `remove`) uma edição de seu arquivo global de
configuração que exclui apenas essa chave, mantendo comentários e layout.

É o único comando além de `signoz mcp config` que é executado sem uma configuração salva, para que um cliente possa ser
limpo após a configuração desaparecer. `--client` e `--dry-run` trabalhar como em `install`.

## `signoz mcp start`, `stop` e `status`

`start` executa o servidor HTTP desconectado, com seu pid e log in `<config dir>/run/`, e imprime sua URL, seu arquivo
de log e o `claude mcp add` linha para registrá-lo. Precisa de uma configuração salva. `--api-key`, `--base-url`,
`--env` e `--port` substitui-o apenas para esta execução, e nunca são salvos. `--foreground` serve no processo atual.

`status` imprime se o servidor está em execução, com sua URL, pid e uptime, e sai com o código 3 quando não está. `stop`
pede ao servidor para desligar através de um token-guarded `POST /shutdown`, e sinaliza o processo apenas se isso
falhar.

## `signoz mcp boot`

`boot enable` instala um serviço do usuário atual que inicia o servidor em cada login, então não é necessário sudo:

| SO      | Serviço                                                                          |
| ------- | -------------------------------------------------------------------------------- |
| Linux   | uma unidade de utilizador systemd (no WSL, activar o sistema em `/etc/wsl.conf`) |
| macOS   | um Agente de Lançamento                                                          |
| Janelas | uma tarefa de logon                                                              |

O serviço lê apenas a configuração gravada. `boot disable` remove- o e `boot status` informa.
