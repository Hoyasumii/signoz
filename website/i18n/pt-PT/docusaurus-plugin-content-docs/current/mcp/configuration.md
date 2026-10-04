---
sidebar_position: 7
title: Configuração
description: "As configurações do servidor e do CLI lido, onde eles são salvos, ea ordem em que eles são resolvidos."
---

# Configuração

Cada configuração vem de uma bandeira, em seguida, o ambiente, em seguida, o arquivo `signoz mcp config` salvo, então o
padrão.

| Variável                    | Para quê?                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `SIGNOZ_BASE_URL`           | O URL da instância                                                                 |
| `SIGNOZ_API_KEY`            | Uma chave API de conta de serviço                                                  |
| `SIGNOZ_AUTH_TOKEN`         | Com `SIGNOZ_REFRESH_AUTH_TOKEN`: a sessão do navegador, em vez de uma chave de API |
| `SIGNOZ_REFRESH_AUTH_TOKEN` | A ficha de actualização da sessão                                                  |
| `SIGNOZ_ENV`                | A `deployment.environment` o filtro de ferramentas de telemetria ligado por padrão |
| `PORT`                      | A porta HTTP (padrão 3767)                                                         |
| `SIGNOZ_CONFIG`             | Onde a configuração salva vive (também `--config`)                                 |

Quando uma chave de API e um par de token são definidos, a chave de API ganha. Ver
[autenticação](../sdk/authentication.md) para de onde cada um vem.

## Onde ela é salva

- `~/.config/signoz/.env` no Linux;
- `~/Library/Application Support/signoz/.env` em macOS;
- `%APPDATA%\signoz\.env` no Windows;
- ou onde quer que seja `SIGNOZ_CONFIG`/`--config` pontos.

O arquivo é escrito com o modo 0600 (no Windows a pasta ACL o protege). Com os tokens do navegador, o par girado vai
para `session.json` ao lado da `.env`, compartilhado por stdio, o daemon e o CLI.

Segredos nunca aparecem em erros, logs, `--help` ou o formulário de configuração.
