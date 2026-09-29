---
sidebar_position: 4
title: Alertas
description: "Alertas disparados, regras de alerta e quando uma regra disparou e se resolveu."
---

# Alertas

| Ferramenta            | O que responde                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| `signoz_list_alerts`  | Alertas ativos agora (disparados ou silenciados): nome, severidade, desde quando, resumo e labels    |
| `signoz_list_rules`   | Todas as regras: id, nome, estado (firing/inactive/disabled), severidade, tipo e janela de avaliação |
| `signoz_get_rule`     | Uma regra completa: sua condição (queries e limite), labels, anotações e canais                      |
| `signoz_rule_history` | Quando uma regra disparou e se resolveu numa janela (linha do tempo), com totais                     |

`signoz_list_alerts` e `signoz_list_rules` recebem um texto `search`; `signoz_list_rules` recebe também um `state`.
`signoz_rule_history` recebe o `id` da regra e uma janela (`since`, ou `start`/`end`), o que alinha um pico com os
alertas que ele gerou.

Criar, alterar ou silenciar regras, canais e downtimes passa pelas [ferramentas genéricas](./generic-tools.md):
`signoz_resources` com `rules`, `channels` ou `downtime` encontra a operação.
