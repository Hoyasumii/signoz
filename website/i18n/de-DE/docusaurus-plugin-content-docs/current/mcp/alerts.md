---
sidebar_position: 4
title: Warnungen
description: "Abfeuern von Warnungen, Warnregeln und wenn eine Regel ausgelöst und gelöst wird."
---

# Warnungen

| Werkzeug              | Was es beantwortet                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `signoz_list_alerts`  | Warnhinweise jetzt aktiv (feuern oder stummgeschaltet): Name, Schweregrad, seit wann, Zusammenfassung und Etiketten |
| `signoz_list_rules`   | Jede Regel: id, name, state (Firing/inactive/disable), severe, type and evaluation window                           |
| `signoz_get_rule`     | Eine vollständige Regel: ihre Bedingung (Abfragen und Schwellenwert), Etiketten, Anmerkungen und Kanäle             |
| `signoz_rule_history` | Wenn eine Regel in einem Fenster (Timeline) ausgelöst und gelöst wird, mit Summen                                   |

`signoz_list_alerts` und `signoz_list_rules` nehmen a `search` Text; `signoz_list_rules` Auch nimmt ein `state`.
`signoz_rule_history` nimmt die Regel `id` und ein Fenster ()`since`, oder `start`/`end`), die eine Spitze mit den
Warnungen, die sie ausgelöst hat, aufstellt.

Das Erstellen, Ändern oder Silencing von Regeln, Kanälen und Ausfallzeiten geht durch die
[Generische Werkzeuge](./generic-tools.md): `signoz_resources` mit `rules`, `channels` oder `downtime` findet die
Operation.
