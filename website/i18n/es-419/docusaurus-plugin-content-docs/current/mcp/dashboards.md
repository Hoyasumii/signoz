---
sidebar_position: 5
title: Dashboards
description: "Build SigNoz paneles desde presets y sus propios paneles, comprobados contra SigNoz antes de que nada se salve."
---

# Dashboards

`signoz_create_dashboard` construye un dashboard en SigNozformato v2 (Perses, `schemaVersion: "v6"`) en una cuadrícula
de 12 columnas, y responde a su `url`.

## Presets

- `api_red`: solicitudes, tasa de error, p50/p95/p99 latencia, solicitudes por estado, los puntos finales que más y las
  últimas solicitudes fallidas. Construido a partir de la entrada del servicio (`kind_string = 'Server'`, ajustable en
  `filter`); `routeAttribute` nombre el punto final (por defecto `http.route`).
- `worker_failures`: carreras y fallas por trabajo, duración p95, tabla por trabajo, los últimos fallos y registros de
  errores. `filter` elige los lapsos que son trabajos (e.g. `name LIKE 'job.%'`), y `jobAttribute` el atributo que los
  nombres (por defecto el nombre del lazo).
- `logs_errors`: ERROR/FATAL por gravedad y las últimas líneas.

Cada preset toma un `service`, y opcionalmente un `environment` y a `title`.

## Sus propios paneles

`sections` tiene sus propias secciones (una fila plegable cada una, con un `title`) de `panels`:

| Campo                  | ¿Para qué?                                                                 |
| ---------------------- | -------------------------------------------------------------------------- |
| `title`, `description` | El encabezado del panel                                                    |
| `kind`                 | `timeseries`, `bar`, `number`, `table`, `pie`, `list` o `text`             |
| `queries`, `formulas`  | Consultas de constructores (A, B, ...) y fórmulas tales como `A / B * 100` |
| `promql`               | A PromQL consulta en lugar de las consultas del constructor                |
| `text`                 | Markdown, para un `text` panel                                             |
| `unit`                 | `ns`, `ms`, `s`, `percent`, `reqps`, `short`, `bytes`…                     |
| `thresholds`           | Líneas (tiempos/bar) o reglas de color (número)                            |
| `width`, `height`      | Columnas de 12, y filas                                                    |

Varias consultas, o cualquier fórmula, hacen una consulta compuesta por panel. `list` Los paneles llevan una consulta de
constructor sin agregación, y muestran líneas de troncos o lapsos.

Pruebe un panel primero con `signoz_preview_panel`: ejecuta la misma definición contra datos en vivo y responde lo que
el panel mostraría, o SigNozEs un error.

## El cheque antes de guardar

Antes de salvar, cada panel ejecuta su consulta en SigNoz (G)`validate: "run"`, cambio `checkWindow`, por defecto `1h`).
Si un panel falla, nada se salva, y la respuesta dice con qué panel falló SigNozEs su propio mensaje. También se
enumeran paneles sin datos en la ventana de verificación. `dryRun: true` responde al JSON sin salvar.

Los paneles de trace y log son consultas de constructor, por lo que SigNoz ofertas **Ver rastros / Ver registros**
cuando haga clic en un punto en el gráfico, sobre el mismo intervalo.

## Ejemplo

```bash
signoz list-services --since 24h --search point
signoz create-dashboard --title "Point — API and workers (production)" --tags team:point \
  --presets '[{"preset":"api_red","service":"point-api"},{"preset":"worker_failures","service":"point-worker"},{"preset":"logs_errors","service":"point-api"}]'
```

## Cambio y participación

- `signoz_update_dashboard` con `mode: "append"` (por defecto) añade presets y secciones debajo de los paneles
  existentes; `mode: "replace"` reconstruye el dashboard de la entrada. Los paneles se revisan de la misma manera.
- `signoz_list_dashboards` y `signoz_get_dashboard` léalos de vuelta (`raw: true` para el JSON completo).
- `signoz_share_dashboard` hace que un dashboard sea visible sin login a través de un enlace público. Cualquier persona
  con el enlace ve sus datos, por lo que necesita `confirm: true`Compartir dentro de la organización no necesita ninguna
  llamada: enviar la URL del dashboard.
