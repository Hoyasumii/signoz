---
sidebar_position: 5
title: Dashboards
description: "Monte dashboards do SigNoz a partir de presets e de painéis seus, conferidos no SigNoz antes de qualquer coisa ser salva."
---

# Dashboards

`signoz_create_dashboard` monta um dashboard no formato v2 do SigNoz (Perses, `schemaVersion: "v6"`) numa grade de
12 colunas e responde a `url` dele.

## Presets

- `api_red`: requisições, taxa de erro, latência p50/p95/p99, requisições por status, os endpoints que mais falham e
  as últimas requisições com falha. Montado a partir dos spans de entrada do serviço (`kind_string = 'Server'`,
  ajustável em `filter`); `routeAttribute` nomeia o endpoint (padrão `http.route`).
- `worker_failures`: execuções e falhas por job, duração p95, uma tabela por job, as últimas falhas e os logs de
  erro. `filter` escolhe os spans que são jobs (ex.: `name LIKE 'job.%'`), e `jobAttribute` o atributo que os nomeia
  (padrão: o nome do span).
- `logs_errors`: ERROR/FATAL por severidade e as últimas linhas.

Cada preset recebe um `service` e, opcionalmente, um `environment` e um `title`.

## Seus próprios painéis

`sections` guarda suas próprias seções (uma linha recolhível cada, com um `title`) de `panels`:

| Campo                  | Para quê                                                        |
| ---------------------- | --------------------------------------------------------------- |
| `title`, `description` | O cabeçalho do painel                                           |
| `kind`                 | `timeseries`, `bar`, `number`, `table`, `pie`, `list` ou `text` |
| `queries`, `formulas`  | Queries do builder (A, B, …) e fórmulas como `A / B * 100`      |
| `promql`               | Uma query PromQL no lugar das queries do builder                |
| `text`                 | Markdown, para um painel `text`                                 |
| `unit`                 | `ns`, `ms`, `s`, `percent`, `reqps`, `short`, `bytes`…          |
| `thresholds`           | Linhas (timeseries/bar) ou regras de cor (number)               |
| `width`, `height`      | Colunas de 12, e linhas                                         |

Várias queries, ou qualquer fórmula, formam uma query composta por painel. Painéis `list` recebem uma query do
builder sem agregação e mostram linhas de log ou spans brutos.

Teste um painel antes com `signoz_preview_panel`: ele roda a mesma definição em dados reais e responde o que o
painel mostraria, ou o erro do SigNoz.

## A conferência antes de salvar

Antes de salvar, cada painel roda sua query no SigNoz (`validate: "run"`, sobre `checkWindow`, padrão `1h`). Se um
painel falha, nada é salvo, e a resposta diz qual painel falhou com a mensagem do próprio SigNoz. Painéis sem dados
na janela de conferência também são listados. `dryRun: true` responde o JSON sem salvar.

Painéis de traces e logs são queries do builder, então o SigNoz oferece **View traces / View logs** quando você clica
num ponto do gráfico, no mesmo intervalo.

## Exemplo

```bash
signoz list-services --since 24h --search point
signoz create-dashboard --title "Point — API e workers (produção)" --tags team:point \
  --presets '[{"preset":"api_red","service":"point-api"},{"preset":"worker_failures","service":"point-worker"},{"preset":"logs_errors","service":"point-api"}]'
```

## Alterando e compartilhando

- `signoz_update_dashboard` com `mode: "append"` (padrão) acrescenta presets e seções abaixo dos painéis existentes;
  `mode: "replace"` refaz o dashboard a partir da entrada. Os painéis são conferidos do mesmo jeito.
- `signoz_list_dashboards` e `signoz_get_dashboard` os leem de volta (`raw: true` para o JSON completo).
- `signoz_share_dashboard` torna um dashboard visível sem login por um link público. Qualquer um com o link vê os
  dados, por isso exige `confirm: true`. Compartilhar dentro da organização não precisa de chamada: envie a URL do
  dashboard.
