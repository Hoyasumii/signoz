---
sidebar_position: 3
title: Ferramentas de telemetria
description: "Serviços, atributos, logs, vestígios, construtores e PromQL consultas e métricas: as ferramentas que lêem telemetria."
---

# Ferramentas de telemetria

## Janelas e ambientes

Cada ferramenta de telemetria leva sua janela como `since` (`15m`, `6h`, `7d`; por omissão `1h`) ou como `start`/`end`
(ISO 8601 ou milissegundos de época; `end` padrão para agora).

As ferramentas que filtram por ambiente adicionam `deployment.environment = <SIGNOZ_ENV>` quando um ambiente padrão é
configurado. `environment` em uma chamada escolhe outro, e `environment: "all"` Larga o filtro. `signoz_query` é a
exceção: adiciona o filtro somente quando você passa `environment`.

Filtros usar SigNozsintaxe da expressão v5: `service.name = 'point-api' AND has_error = true`.

## Procurar o que existe primeiro

| Ferramenta             | O que ele responde                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `signoz_list_services` | Serviços que enviaram spans na janela: spans, erros, taxa de erro, p95. `search` estreita |
| `signoz_field_keys`    | Nomes de campos de atributos e recursos para um `signal` (`traces`, `logs`, `metrics`)    |
| `signoz_field_values`  | Valores de um campo (`name`), `search` e por `existingQuery`                              |

Use-os para encontrar o exato `service.name`, o atributo que nomeia uma rota ou um trabalho, e os ambientes.

## Registos e vestígios

- `signoz_search_logs`: as últimas linhas por `service`, `severity` (e.g. `["ERROR", "FATAL"]`), `text` (um substring do
  corpo) e `filter`O mais novo primeiro. Linhas de transporte `trace_id` Quando o registo estiver correlacionado;
  `withAttributes` adiciona cada atributo.
- `signoz_search_traces`: os últimos `service`, `operation` (nome do span), `errorsOnly`, `minDurationMs` e `filter`,
  mais recente primeiro ou mais lento (`orderBy`). `fields` adiciona atributos a cada linha.
- `signoz_get_trace`: um traço como uma cachoeira, com o serviço raiz, span e contagens de erro, profundidade de cada
  span, duração e principais atributos HTTP/DB, e suas exceções.

## Consultas

`signoz_query` executa consultas de construtor sobre traços, logs ou métricas, com fórmulas ou PromQL query: as mesmas
consultas que um painel de painel executa. `requestType` escolhe a forma:

- `time_series` (padrão): cada série resumida como min, max, média, último valor e o tempo do pico. `withPoints` soma
  até 60 pontos por série; `stepSeconds` define o tamanho do balde.
- `scalar`: uma linha por grupo.
- `raw`: linhas.

Use-o para investigar um pico, e para verificar uma consulta antes de colocá-lo em um painel.

## Métricas

- `signoz_list_metrics`: nomes métricos recebidos na janela, com tipo, unidade e descrição. Com `name`, os metadados
  dessa métrica (tipo, temporalidade, unidade).
- `signoz_query_metrics`: uma métrica ao longo do tempo, por `metric` com `timeAggregation` (padrão `rate`; `avg` ou
  `latest` para os gabaritos), `spaceAggregation` (padrão `sum`; `p50`...`p99` para histogramas), `filter` e `groupBy` —
  ou `promql` Em vez disso.
