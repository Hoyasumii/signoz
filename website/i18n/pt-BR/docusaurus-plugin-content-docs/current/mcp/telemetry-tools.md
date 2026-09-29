---
sidebar_position: 3
title: Ferramentas de telemetria
description: "Serviços, atributos, logs, traces, queries do builder e PromQL, e métricas: as ferramentas que leem telemetria."
---

# Ferramentas de telemetria

## Janelas e ambientes

Toda ferramenta de telemetria recebe a janela como `since` (`15m`, `6h`, `7d`; padrão `1h`) ou como `start`/`end`
(ISO 8601 ou epoch em milissegundos; `end` é agora por padrão).

As ferramentas que filtram por ambiente acrescentam `deployment.environment = <SIGNOZ_ENV>` quando há um ambiente
padrão configurado. `environment` numa chamada escolhe outro, e `environment: "all"` remove o filtro. `signoz_query`
é a exceção: só acrescenta o filtro quando você passa `environment`.

Os filtros usam a sintaxe de expressões v5 do SigNoz: `service.name = 'point-api' AND has_error = true`.

## Descubra o que existe primeiro

| Ferramenta             | O que responde                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `signoz_list_services` | Serviços que enviaram spans na janela: spans, erros, taxa de erro, p95. `search` filtra  |
| `signoz_field_keys`    | Nomes de atributos e campos de resource de um `signal` (`traces`, `logs`, `metrics`)     |
| `signoz_field_values`  | Valores de um campo (`name`), opcionalmente filtrados por `search` e por `existingQuery` |

Use-as para achar o `service.name` exato, o atributo que nomeia uma rota ou um job, e os ambientes.

## Logs e traces

- `signoz_search_logs`: as linhas mais recentes por `service`, `severity` (ex.: `["ERROR", "FATAL"]`), `text` (um
  trecho do corpo) e `filter`, mais recentes primeiro. As linhas trazem `trace_id` quando o log está correlacionado;
  `withAttributes` acrescenta todos os atributos.
- `signoz_search_traces`: os spans mais recentes por `service`, `operation` (o nome do span), `errorsOnly`,
  `minDurationMs` e `filter`, mais recentes ou mais lentos primeiro (`orderBy`). `fields` acrescenta atributos a
  cada linha.
- `signoz_get_trace`: um trace em cascata, com o serviço raiz, as contagens de spans e erros, a profundidade, a
  duração e os principais atributos HTTP/DB de cada span, e suas exceções.

## Queries

`signoz_query` roda queries do builder sobre traces, logs ou métricas, com fórmulas, ou uma query PromQL: as mesmas
queries que um painel de dashboard roda. `requestType` escolhe o formato:

- `time_series` (padrão): cada série resumida em mínimo, máximo, média, último valor e o momento do pico.
  `withPoints` acrescenta até 60 pontos por série; `stepSeconds` define o tamanho do bucket.
- `scalar`: uma linha por grupo.
- `raw`: linhas.

Use-a para investigar um pico e para conferir uma query antes de colocá-la num dashboard.

## Métricas

- `signoz_list_metrics`: nomes de métricas recebidas na janela, com tipo, unidade e descrição. Com `name`, os
  metadados daquela métrica (tipo, temporalidade, unidade).
- `signoz_query_metrics`: uma métrica ao longo do tempo, por `metric` com `timeAggregation` (padrão `rate`; `avg`
  ou `latest` para gauges), `spaceAggregation` (padrão `sum`; `p50`…`p99` para histogramas), `filter` e `groupBy` —
  ou `promql` no lugar.
