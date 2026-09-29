---
sidebar_position: 2
title: signoz mcp
description: "signoz mcp: salve a configuração, rode o servidor em segundo plano, inicie-o no login e registre-o nos seus clientes MCP."
---

# `signoz mcp`

`signoz mcp` gerencia o servidor MCP para você: a configuração salva, um servidor HTTP em segundo plano, um serviço
de login e o registro nos seus clientes MCP.

```bash
npx signoz mcp config                 # pede as configurações no terminal e as salva
npx signoz mcp config --env production --port 4000   # sem perguntas (scripts, CI): salva só estas, mantém o resto
npx signoz mcp config --web           # o mesmo, num formulário web local
npx signoz mcp install                # escolha Claude Code / Codex / OpenCode e registre o signoz-mcp (stdio) neles
npx signoz mcp install --client claude,opencode --force   # sem seletor (scripts, CI); --force substitui uma entrada
npx signoz mcp uninstall              # escolha de quais clientes remover a entrada 'signoz' (sem config salva)
npx signoz mcp start                  # inicia em segundo plano (precisa de config salva); imprime a URL para `claude mcp add`
npx signoz mcp start --api-key outra --port 4000   # valores avulsos, nunca salvos
npx signoz mcp status                 # rodando ou parado (saída 3), URL, pid, tempo no ar
npx signoz mcp stop
npx signoz mcp boot enable            # inicia a cada login; `boot disable` / `boot status`
```

## `signoz mcp config`

Grava o `.env` salvo ([Configuração](../mcp/configuration.md)). Funciona de três jeitos:

- **No terminal** (o padrão). Pede cada configuração por vez, a partir dos valores salvos. Segredos são digitados
  mascarados: enter mantém o salvo, e `-` o apaga.
- **Com flags.** Com qualquer uma de `--base-url`, `--api-key`, `--auth-token`, `--refresh-auth-token`, `--env` ou
  `--port`, não pergunta nada e salva só essas. Sem um terminal, elas são necessárias. Um segredo passado como flag
  fica no histórico do shell, então prefira o prompt para ele.
- **Num formulário web** com `--web`: uma página local, aberta no navegador (`--no-open` para só imprimir a URL). Um
  segredo em branco mantém o salvo.

Se um servidor estiver rodando, ele avisa: reinicie-o para pegar as mudanças. `--config <arquivo>` (ou
`SIGNOZ_CONFIG`) grava outro arquivo.

## `signoz mcp install`

Detecta cada cliente rodando seu `--version` e registra o servidor stdio pela CLI do próprio cliente, com o nome
`signoz`:

| Cliente     | Comando que roda            |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

O comando registrado é `node <pacote>/dist/mcp/cli.js` por caminho absoluto, sem credencial: o servidor lê o arquivo
salvo quando o cliente o inicia (`SIGNOZ_CONFIG` só é passado quando `--config` indica outro arquivo).

Todo cliente encontrado começa marcado. Um que já tem uma entrada `signoz` aparece como
`already installed, reinstalls` e a tem substituída. Sem um terminal interativo, `--client` é obrigatório
(`claude`, `codex`, `opencode`; dentro do WSL também `claude@windows`, `codex@windows`, `opencode@windows`), mais
`--force` para substituir uma entrada. `--dry-run` imprime os comandos em vez de rodá-los.

`install` e `uninstall` trabalham na configuração de nível de usuário (global) de cada cliente. Entradas de escopo de
projeto nunca são tocadas.

## `signoz mcp uninstall`

Lista os clientes com uma entrada `signoz`, mostrando se é `stdio` ou `http`, e remove qualquer entrada com esse
nome: `claude mcp remove -s user`, `codex mcp remove` e, no OpenCode (que não tem `remove`), uma edição do arquivo
de configuração global que apaga só essa chave, mantendo comentários e layout.

É o único comando, além de `signoz mcp config`, que roda sem uma configuração salva, para que um cliente possa ser
limpo depois que a configuração sumiu. `--client` e `--dry-run` funcionam como no `install`.

## `signoz mcp start`, `stop` e `status`

`start` roda o servidor HTTP destacado, com pid e log em `<pasta de config>/run/`, e imprime a URL, o arquivo de log
e a linha `claude mcp add` para registrá-lo. Precisa de uma configuração salva. `--api-key`, `--base-url`, `--env` e
`--port` a sobrescrevem só nessa execução, e nunca são salvos. `--foreground` serve no processo atual.

`status` imprime se o servidor está rodando, com URL, pid e tempo no ar, e sai com código 3 quando não está. `stop`
pede ao servidor que encerre por um `POST /shutdown` protegido por token, e só sinaliza o processo se isso falhar.

## `signoz mcp boot`

`boot enable` instala um serviço do usuário atual que inicia o servidor a cada login, então não precisa de sudo:

| SO      | Serviço                                                                     |
| ------- | --------------------------------------------------------------------------- |
| Linux   | uma unit systemd de usuário (no WSL, habilite o systemd em `/etc/wsl.conf`) |
| macOS   | um LaunchAgent                                                              |
| Windows | uma tarefa de logon                                                         |

O serviço lê só a configuração salva. `boot disable` o remove e `boot status` o informa.
