---
sidebar_position: 4
title: Alertas
description: "Alertas, reglas de alerta y cuando una regla dispara y resuelve."
---

# Alertas

| Herramienta           | Lo que responde                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `signoz_list_alerts`  | Alertas activas ahora mismo (firingo o silenciado): nombre, severidad, desde cuándo, resumen y etiquetas |
| `signoz_list_rules`   | Cada regla: id, nombre, estado (firing/inactive/disabled), severidad, tipo y ventana de evaluación       |
| `signoz_get_rule`     | Una regla completa: su condición (preguntas y umbral), etiquetas, anotaciones y canales                  |
| `signoz_rule_history` | Cuando una regla disparada y resuelta en una ventana (timeline), con totales                             |

`signoz_list_alerts` y `signoz_list_rules` Toma. `search` texto; `signoz_list_rules` también toma un `state`.
`signoz_rule_history` toma la regla `id` y una ventana (`since`o `start`/`end`), que hace un aumento con las alertas que
levantó.

Crear, cambiar o silenciar reglas, canales y tiempos de inactividad pasa por los
[herramientas genéricas](./generic-tools.md): `signoz_resources` con `rules`, `channels` o `downtime` encuentra la
operación.
