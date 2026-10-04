---
sidebar_position: 3
title: Telemetriewerkzeuge
description: "Dienste, Attribute, Logs, Traces, Builder und PromQL Abfragen und Metriken: die Werkzeuge, die Telemetrie lesen."
---

# Telemetriewerkzeuge

## Windows und Umgebungen

Jedes Telemetriewerkzeug nimmt sein Fenster als `since` ()`15m`, `6h`, `7d`; Standard `1h`) oder als `start`/`end` (ISO
8601 oder epochale Millisekunden); `end` Defaults bis jetzt.

Die Werkzeuge, die nach Umgebung filtern, fügen hinzu `deployment.environment = <SIGNOZ_ENV>` wenn eine Standardumgebung
konfiguriert ist. `environment` auf einem Anruf wählt einen anderen und `environment: "all"` den Filter fallen lässt.
`signoz_query` ist die Ausnahme: Es fügt den Filter nur hinzu, wenn Sie passieren `environment`.

Filtereinsatz SigNozs v5-Ausdrucksyntax: `service.name = 'point-api' AND has_error = true`.

## Finde, was zuerst existiert

| Werkzeug               | Was es beantwortet                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `signoz_list_services` | Dienste, die im Fenster Spannweiten gesendet haben: Spannweiten, Fehler, Fehlerrate, p95. `search` eng |
| `signoz_field_keys`    | Attribute und Ressourcenfeldnamen für eine `signal` ()`traces`, `logs`, `metrics`)                     |
| `signoz_field_values`  | Werte eines Feldes ()`name`), gegebenenfalls verengt durch `search` und durch `existingQuery`          |

Verwenden Sie sie, um die genaue `service.name`, das Attribut, das eine Route oder einen Job benennt, und die
Umgebungen.

## Stämme und Spuren

- `signoz_search_logs`: die neuesten Zeilen von `service`, `severity` ()e.g. `["ERROR", "FATAL"]`, `text` (eine
  Substring des Körpers) und `filter`Neueste zuerst. Reihen tragen `trace_id` wenn das Protokoll korreliert ist;
  `withAttributes` fügt jedes Attribut hinzu.
- `signoz_search_traces`: die letzten Spannen von `service`, `operation` (der Name der Spanne), `errorsOnly`,
  `minDurationMs` und `filter`, neueste zuerst oder langsamste zuerst`orderBy`. `fields` fügt jeder Zeile Attribute
  hinzu.
- `signoz_get_trace`: eine Spur als Wasserfall, wobei der Root-Service, die Spanne und der Fehler zählen, die Tiefe,
  Dauer und die wichtigsten HTTP/DB-Attribute jeder Spanne und ihre Ausnahmen.

## Abfragen

`signoz_query` führt Builder-Abfragen über Traces, Protokolle oder Metriken mit Formeln oder PromQL Abfrage: die
gleichen Abfragen, die ein Dashboard-Panel ausführt. `requestType` wählt die Form:

- `time_series` (Standard): Jede Serie wird zusammengefasst als min, max, Durchschnitt, letzter Wert und die Zeit des
  Peaks. `withPoints` bis zu 60 Punkte pro Serie ergibt; `stepSeconds` Legt die Bucket-Größe fest.
- `scalar`Eine Zeile pro Gruppe.
- `raw`: Zeilen.

Verwenden Sie es, um einen Spike zu untersuchen und eine Abfrage zu überprüfen, bevor Sie es auf ein Dashboard legen.

## Metriken

- `signoz_list_metrics`: im Fenster empfangene metrische Namen mit Typ, Einheit und Beschreibung. mit `name`die
  Metadaten dieser einen Metrik (Typ, Zeitlichkeit, Einheit).
- `signoz_query_metrics`: eine Metrik über die Zeit, von `metric` mit `timeAggregation` (Standard) `rate`; `avg` oder
  `latest` bei Spurweiten, `spaceAggregation` (Standard) `sum`; `p50`...`p99` für Histogramme, `filter` und `groupBy` —
  oder `promql` Stattdessen.
