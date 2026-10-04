---
sidebar_position: 3
title: Herramientas de telemetría
description: "Servicios, atributos, registros, trazas, constructores y PromQL consultas y métricas: las herramientas que leen la telemetría."
---

# Herramientas de telemetría

## Windows y entornos

Cada herramienta de telemetría toma su ventana como `since` (G)`15m`, `6h`, `7d`; por defecto `1h`) o como `start`/`end`
(ISO 8601 o epoca milisegundos; `end` predeterminado a ahora).

Las herramientas que filtran por medio ambiente añaden `deployment.environment = <SIGNOZ_ENV>` cuando se configura un
entorno predeterminado. `environment` en una llamada elige otro, y `environment: "all"` deja caer el filtro.
`signoz_query` es la excepción: añade el filtro sólo cuando pasa `environment`.

Uso de filtros SigNozSintaxis de expresión v5: `service.name = 'point-api' AND has_error = true`.

## Encontrar lo que existe primero

| Herramienta            | Lo que responde                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `signoz_list_services` | Servicios que enviaron lapsos en la ventana: lapsos, errores, tasa de error, p95. `search` estrechos |
| `signoz_field_keys`    | Attribute and resource field names for a `signal` (G)`traces`, `logs`, `metrics`)                    |
| `signoz_field_values`  | Valores de un campo (`name`), opcionalmente estrechado por `search` y por `existingQuery`            |

Úsalos para encontrar exactamente `service.name`, el atributo que nombre una ruta o un trabajo, y los ambientes.

## Registros y trazas

- `signoz_search_logs`: las últimas líneas por `service`, `severity` (G)e.g. `["ERROR", "FATAL"]`), `text` (una
  subestring del cuerpo) y `filter`Lo más nuevo primero. Las filas llevan `trace_id` cuando el registro está
  correlacionado; `withAttributes` añade cada atributo.
- `signoz_search_traces`: los últimos tiempos `service`, `operation` (el nombre del lazo) `errorsOnly`, `minDurationMs`
  y `filter`, más reciente primero o más lento primero (`orderBy`). `fields` añade atributos a cada fila.
- `signoz_get_trace`: un trazo como cascada, con el servicio raíz, el lapso y los recuentos de errores, la profundidad,
  duración y los atributos clave HTTP/DB, y sus excepciones.

## Consultas

`signoz_query` carreras de constructor de consultas sobre trazas, troncos o métricas, con fórmulas, o PromQL consulta:
las mismas consultas que un panel de panel de control corre. `requestType` elige la forma:

- `time_series` (default): cada serie resumido como min, max, promedio, último valor y el tiempo del pico. `withPoints`
  suma hasta 60 puntos por serie; `stepSeconds` establece el tamaño del cubo.
- `scalar`: una fila por grupo.
- `raw`: filas.

Úsalo para investigar un pico, y para comprobar una consulta antes de ponerla en un tablero.

## Metrices

- `signoz_list_metrics`: nombres métricos recibidos en la ventana, con tipo, unidad y descripción. Con `name`, los
  metadatos de esa métrica (tipo, temporalidad, unidad).
- `signoz_query_metrics`: una métrica con el tiempo, por `metric` con `timeAggregation` (default) `rate`; `avg` o
  `latest` para calibres), `spaceAggregation` (default) `sum`; `p50`...`p99` para histogramas), `filter` y `groupBy` o
  `promql` en lugar de eso.
