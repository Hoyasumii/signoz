---
sidebar_position: 7
title: Configuração
description: "As configurações que o servidor e a CLI leem, onde ficam salvas e a ordem em que são resolvidas."
---

# Configuração

Cada configuração vem de uma flag, depois do ambiente, depois do arquivo que `signoz mcp config` salvou, depois do
padrão.

| Variável                    | Para quê                                                                        |
| --------------------------- | ------------------------------------------------------------------------------- |
| `SIGNOZ_BASE_URL`           | A URL da instância                                                              |
| `SIGNOZ_API_KEY`            | Uma API key de service account                                                  |
| `SIGNOZ_AUTH_TOKEN`         | Com `SIGNOZ_REFRESH_AUTH_TOKEN`: a sessão do navegador, no lugar de uma API key |
| `SIGNOZ_REFRESH_AUTH_TOKEN` | O refresh token da sessão                                                       |
| `SIGNOZ_ENV`                | O `deployment.environment` que as ferramentas de telemetria filtram por padrão  |
| `PORT`                      | A porta HTTP (padrão 3767)                                                      |
| `SIGNOZ_CONFIG`             | Onde fica a configuração salva (também `--config`)                              |

Quando há uma API key e um par de tokens, a API key vence. Veja [Autenticação](../sdk/authentication.md) para a
origem de cada um.

## Onde fica salva

- `~/.config/signoz/.env` no Linux;
- `~/Library/Application Support/signoz/.env` no macOS;
- `%APPDATA%\signoz\.env` no Windows;
- ou onde `SIGNOZ_CONFIG`/`--config` apontar.

O arquivo é gravado com modo 0600 (no Windows a ACL da pasta o protege). Com os tokens do navegador, o par
rotacionado vai para `session.json` ao lado do `.env`, compartilhado pelo stdio, pelo daemon e pela CLI.

Segredos nunca aparecem em erros, logs, `--help` ou no formulário de configuração.
