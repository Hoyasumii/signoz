---
sidebar_position: 5
title: Dashboards
description: "Bau SigNoz Dashboards von Presets und Ihren eigenen Panels, geprüft gegen SigNoz bevor etwas gerettet wird."
---

# Dashboards

`signoz_create_dashboard` Baut ein Dashboard in SigNoz's v2-Format (Perses), `schemaVersion: "v6"`) auf einem
12-spalten-raster und beantwortet seine. `url`.

## Presets

- `api_red`: Anforderungen, Fehlerrate, p50/p95/p99-Latenz, Anforderungen nach Status, die Endpunkte, die am meisten
  fehlschlagen, und die letzten fehlgeschlagenen Anforderungen. Gebaut aus den Eingangsspannen des Dienstes
  ()`kind_string = 'Server'`, einstellbar in `filter`; `routeAttribute` benennt den Endpunkt (Standard) `http.route`.
- `worker_failures`: Runs and Failures per Job, p95 Duration, eine Pro-Job-Tabelle, die neuesten Fehler und
  Fehlerprotokolle. `filter` Wählen Sie die Spannen, die Jobs sind ()e.g. `name LIKE 'job.%'`, und `jobAttribute` Das
  Attribut, das sie benennt (standardmäßig den Span-Namen).
- `logs_errors`: FEHLER / FATAL nach Schweregrad und den neuesten Zeilen.

Jedes Preset nimmt eine `service`und gegebenenfalls `environment` und a `title`.

## Ihre eigenen Panels

`sections` hält Ihre eigenen Abschnitte (jeweils eine zusammenklappbare Reihe, mit einer) `title`) `panels`:

| Feld                   | Was ist                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `title`, `description` | Header des Panels                                                 |
| `kind`                 | `timeseries`, `bar`, `number`, `table`, `pie`, `list` oder `text` |
| `queries`, `formulas`  | Builder-Abfragen (A, B, ...) und Formeln wie `A / B * 100`        |
| `promql`               | A PromQL Query statt Builder Queries                              |
| `text`                 | Markdown, für eine `text` Platte                                  |
| `unit`                 | `ns`, `ms`, `s`, `percent`, `reqps`, `short`, `bytes`…            |
| `thresholds`           | Linien (Zeitreihen/Balken) oder Farbregeln (Zahl)                 |
| `width`, `height`      | Spalten von 12 und Zeilen                                         |

Mehrere Abfragen oder eine beliebige Formel erstellen eine zusammengesetzte Abfrage pro Panel. `list` Panels nehmen eine
Builder-Abfrage ohne Aggregation und zeigen rohe Protokolllinien oder Spannweiten an.

Probieren Sie ein Panel zuerst mit `signoz_preview_panel`: es läuft mit der gleichen Definition gegen Live-Daten und
beantwortet, was das Panel zeigen würde, oder SigNoz's Fehler.

## Die Prüfung vor dem Speichern

Vor dem Speichern führt jedes Panel seine Abfrage auf SigNoz ()`validate: "run"`, über `checkWindow`, Standard `1h`.
Wenn ein Panel fehlschlägt, wird nichts gespeichert, und die Antwort sagt, welches Panel fehlgeschlagen ist SigNozDie
eigene Botschaft. Panels ohne Daten im Kontrollfenster sind ebenfalls aufgeführt. `dryRun: true` Antwortet das JSON ohne
zu sparen.

Trace und Log Panels sind Builder Queries, also SigNoz Angebote **View Traces / View Logs** Wenn Sie auf einen Punkt im
Diagramm klicken, über das gleiche Intervall.

## Beispiel

```bash
signoz list-services --since 24h --search point
signoz create-dashboard --title "Point — API and workers (production)" --tags team:point \
  --presets '[{"preset":"api_red","service":"point-api"},{"preset":"worker_failures","service":"point-worker"},{"preset":"logs_errors","service":"point-api"}]'
```

## Ändern und Teilen

- `signoz_update_dashboard` mit `mode: "append"` (Standard) fügt Presets und Abschnitte unterhalb der vorhandenen Panels
  hinzu; `mode: "replace"` baut das Dashboard vom Eingang wieder auf. Panels werden auf die gleiche Weise überprüft.
- `signoz_list_dashboards` und `signoz_get_dashboard` Lesen Sie sie zurück ()`raw: true` für den vollen JSON.
- `signoz_share_dashboard` macht ein Dashboard ohne Anmeldung über einen öffentlichen Link sichtbar. Jeder mit dem Link
  sieht seine Daten, also braucht es `confirm: true`Das Teilen innerhalb der Organisation erfordert keinen Anruf: Senden
  der URL des Dashboards.
