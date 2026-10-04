---
sidebar_position: 5
title: 电线板
description: "构建 SigNoz 预设和自己面板的仪表板,核对 SigNoz 在任何东西被保存之前。"
---

# 电线板

`signoz_create_dashboard` 在 SigNoz'v2格式 (Perses, `schemaVersion: "v6"`在12列的网格上,并回答它的 `url`。 。 。 。

## 预设

- `api_red`:请求,错误率,p50/p95/p99 延迟,按状态请求,最失败和最近失败请求的终点. 由服务入口跨度建造(`kind_string = 'Server'`中,可调整 `filter`(三)
  `routeAttribute` 命名终点( 默认) `http.route`) (中文(简体) ).
- `worker_failures`:每个工作运行和失败,p95持续时间,每个工作表,最新的失败和错误日志. `filter` 选择工作跨度( E)e.g。 。 。 。 `name LIKE 'job.%'`),以及
  `jobAttribute` 命名它们的属性(默认跨度名称)。
- `logs_errors`: 按严重程度和最新线分列的错误/肺结核。

每个预设需要一个 `service`,可选 `environment` (单位:千美元) `title`。 。 。 。

## 您自己的面板

`sections` 保存自己的区域(每条可折叠的行,带有 `title`(单位:千美元) `panels`编号 :

| 外地                   | 为什么                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `title`, `description` | 面板头                                                                                                  |
| `kind`                 | `timeseries`, (中文). `bar`, (中文). `number`, (中文). `table`, (中文). `pie`, (中文). `list` 或 `text` |
| `queries`, `formulas`  | 构建器查询(A, B,...)和公式,例如 `A / B * 100`                                                           |
| `promql`               | 页:1 PromQL 查询而不是构建者查询                                                                        |
| `text`                 | 马克下,一个 `text` 面板                                                                                 |
| `unit`                 | `ns`, `ms`, `s`, `percent`, `reqps`, `short`, `bytes`…                                                  |
| `thresholds`           | 行(时间序列/栏)或颜色规则(数目)                                                                         |
| `width`, `height`      | 排出12列和行数                                                                                          |

几个查询,或者任何公式,每个面板都做了一个综合查询. `list` 面板采用一个没有集合的构建者查询,并显示原始日志行或跨度 。

尝试先使用面板 `signoz_preview_panel`: 它对活数据运行相同的定义,并解答面板将显示的内容,或者 SigNoz'错误。

## 保存前的支票

在保存前, 每个面板都会运行它的查询 SigNoz (单位:千美元)`validate: "run"`结束 `checkWindow`默认值 `1h`) (中文(简体) ). 如果面板失败, 则没有保存任何内容, 答案是显示哪个面板失败 。
SigNoz自己的讯息。 检查窗口中没有数据的面板也被列出. `dryRun: true` 回答JSON而不省钱。

追踪和日志面板是构建者查询,所以 SigNoz 提议 **查看痕迹/ 查看日志** 当单击图表上的点时,在同一间隔。

## 示例

```bash
signoz list-services --since 24h --search point
signoz create-dashboard --title "Point — API and workers (production)" --tags team:point \
  --presets '[{"preset":"api_red","service":"point-api"},{"preset":"worker_failures","service":"point-worker"},{"preset":"logs_errors","service":"point-api"}]'
```

## 改变和分享

- `signoz_update_dashboard` 与 `mode: "append"` (默认)在现有面板下增加预设和部分; `mode: "replace"` 从输入中重建仪表板。 检查面板的方式相同。
- `signoz_list_dashboards` 和 `signoz_get_dashboard` 读回来`raw: true` 完全JSON。 。 。
- `signoz_share_dashboard` 使一个没有登录的仪表板可以通过公共链接查看。 任何有链接的人都能看到它的数据 所以它需要 `confirm: true`. 组织内部共享不需要呼叫:发送仪表板的URL.
