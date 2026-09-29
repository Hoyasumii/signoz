---
sidebar_position: 4
title: Alerts
description: "Firing alerts, alert rules and when a rule fired and resolved."
---

# Alerts

| Tool                  | What it answers                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `signoz_list_alerts`  | Alerts active right now (firing or silenced): name, severity, since when, summary and labels |
| `signoz_list_rules`   | Every rule: id, name, state (firing/inactive/disabled), severity, type and evaluation window |
| `signoz_get_rule`     | One rule in full: its condition (queries and threshold), labels, annotations and channels    |
| `signoz_rule_history` | When a rule fired and resolved in a window (timeline), with totals                           |

`signoz_list_alerts` and `signoz_list_rules` take a `search` text; `signoz_list_rules` also takes a `state`.
`signoz_rule_history` takes the rule's `id` and a window (`since`, or `start`/`end`), which lines a spike up with
the alerts it raised.

Creating, changing or silencing rules, channels and downtimes goes through the
[generic tools](./generic-tools.md): `signoz_resources` with `rules`, `channels` or `downtime` finds the operation.
