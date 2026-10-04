---
sidebar_position: 4
title: Alertas
description: "Alertas de disparo, regras de alerta e quando uma regra disparada e resolvida."
---

# Alertas

| Ferramenta            | O que ele responde                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `signoz_list_alerts`  | Alertas ativos neste momento (descanso ou silenciado): nome, severidade, desde quando, resumo e rótulos |
| `signoz_list_rules`   | Cada regra: id, nome, estado (desativação/inativa/inativada), gravidade, tipo e janela de avaliação     |
| `signoz_get_rule`     | Uma regra completa: sua condição (queries e liminar), etiquetas, anotações e canais                     |
| `signoz_rule_history` | Quando uma regra disparada e resolvida numa janela (linha de tempo), com totais                         |

`signoz_list_alerts` e `signoz_list_rules` tomar a `search` texto; `signoz_list_rules` também toma uma `state`.
`signoz_rule_history` toma a regra `id` e uma janela (`since`, ou `start`/`end`), que alinha um pico com os alertas que
ele levantou.

Criação, alteração ou silenciamento de regras, canais e tempos de inatividade
[ferramentas genéricas](./generic-tools.md): `signoz_resources` com `rules`, `channels` ou `downtime` Encontra a
operação.
