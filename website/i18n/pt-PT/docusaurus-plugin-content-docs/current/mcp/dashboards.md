---
sidebar_position: 5
title: Painéis
description: "Compilar SigNoz painéis de predefinições e seus próprios painéis, verificados SigNoz antes que alguma coisa seja salva."
---

# Painéis

`signoz_create_dashboard` constrói um painel SigNozformato v2 (Perses, `schemaVersion: "v6"`) numa grelha de 12 colunas,
e responde ao seu `url`.

## Predefinições

- `api_red`: requisições, taxa de erro, latência p50/p95/p99, requisições por status, os endpoints que mais falham e as
  últimas solicitações falhadas. Construído a partir dos períodos de entrada do serviço (`kind_string = 'Server'`,
  ajustável em `filter`); `routeAttribute` nomeia o endpoint (padrão `http.route`).
- `worker_failures`: execuções e falhas por trabalho, duração p95, uma tabela por trabalho, as últimas falhas e
  registros de erros. `filter` escolhe os espaços que são empregos (e.g. `name LIKE 'job.%'`), e `jobAttribute` o
  atributo que os nomeia (default the span name).
- `logs_errors`: ERRO/FATAL por gravidade e as últimas linhas.

Cada predefinição toma uma `service`, e opcionalmente `environment` e a `title`.

## Os seus próprios painéis

`sections` possui suas próprias seções (uma linha dobrável cada, com `title`) de `panels`:

| Campo                  | Para quê?                                                         |
| ---------------------- | ----------------------------------------------------------------- |
| `title`, `description` | O cabeçalho do painel                                             |
| `kind`                 | `timeseries`, `bar`, `number`, `table`, `pie`, `list` ou `text`   |
| `queries`, `formulas`  | Consultas do construtor (A, B, ...) e fórmulas como `A / B * 100` |
| `promql`               | A PromQL consulta em vez de consultas do construtor               |
| `text`                 | Marcação, para uma `text` painel                                  |
| `unit`                 | `ns`, `ms`, `s`, `percent`, `reqps`, `short`, `bytes`…            |
| `thresholds`           | Linhas (timessérie/barra) ou regras de cor (número)               |
| `width`, `height`      | Colunas de 12 e linhas                                            |

Várias consultas, ou qualquer fórmula, fazem uma consulta composta por painel. `list` painéis levam uma consulta
construtor sem agregação, e mostram linhas de log cru ou spans.

Tente um painel primeiro com `signoz_preview_panel`: executa a mesma definição contra dados ao vivo e responde ao que o
painel mostraria, ou SigNozErro.

## A verificação antes de gravar

Antes de salvar, cada painel executa sua consulta em SigNoz (`validate: "run"`, acabou. `checkWindow`, padrão `1h`). Se
um painel falhar, nada é salvo, e a resposta diz qual painel falhou com SigNozÉ a própria mensagem. Painéis sem dados na
janela de verificação também estão listados. `dryRun: true` responde ao JSON sem poupar.

Trace e painéis de registro são consultas de construtor, então SigNoz ofertas **Ver traços / Ver registos** quando você
clica em um ponto no gráfico, no mesmo intervalo.

## Exemplo

```bash
signoz list-services --since 24h --search point
signoz create-dashboard --title "Point — API and workers (production)" --tags team:point \
  --presets '[{"preset":"api_red","service":"point-api"},{"preset":"worker_failures","service":"point-worker"},{"preset":"logs_errors","service":"point-api"}]'
```

## Mudança e partilha

- `signoz_update_dashboard` com `mode: "append"` (padrão) adiciona predefinições e secções abaixo dos painéis
  existentes; `mode: "replace"` reconstrói o painel a partir da entrada. Os painéis são verificados da mesma forma.
- `signoz_list_dashboards` e `signoz_get_dashboard` leia-os de volta (`raw: true` para o JSON completo).
- `signoz_share_dashboard` torna um painel visualizável sem login através de um link público. Qualquer pessoa com o link
  vê seus dados, então ele precisa `confirm: true`. Compartilhamento dentro da organização não precisa de chamada: envie
  o URL do painel.
