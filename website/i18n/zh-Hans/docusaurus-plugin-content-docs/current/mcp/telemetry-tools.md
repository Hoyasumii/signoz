---
sidebar_position: 3
title: 遥测工具
description: "服务、属性、日志、痕迹、构建者和 PromQL 查询和计量:读取遥测的工具。"
---

# 遥测工具

## 窗口和环境

每个遥测工具都把窗口当作 `since` (单位:千美元)`15m`, (中文). `6h`, (中文). `7d`; 默认 `1h`或作为 `start`页:1`end` (ISO 8601或划时代毫秒; `end` 默认为现在).

通过环境过滤的工具添加 `deployment.environment = <SIGNOZ_ENV>` 当设置默认环境时。 `environment` 在电话中选择另一个, `environment: "all"` 放下过滤器。
`signoz_query` 是例外: 它只在您通过时添加过滤器 `environment`。 。 。 。

使用过滤器 SigNozv5 表达式语法 : `service.name = 'point-api' AND has_error = true`。 。 。 。

## 先找到存在的东西

| 工具                   | 它的答案是什么                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `signoz_list_services` | 在窗口中发送跨度的服务:跨度,误差,误差率,p95. `search` 缩进                                 |
| `signoz_field_keys`    | a 属性和资源字段名称 `signal` (单位:千美元)`traces`, (中文). `logs`, (中文). `metrics`页:1 |
| `signoz_field_values`  | 一个字段的值( A)`name`),可选缩小 `search` 由 `existingQuery`                               |

用它们来找到准确的 `service.name`,指代一个路径或工作,以及环境的属性。

## 日志和痕迹

- `signoz_search_logs`: 最新的线条 `service`, (中文). `severity` (单位:千美元)e.g。 。 。 。 `["ERROR", "FATAL"]`), (中文(简体) ). `text`
  (身体的支线)和 `filter`首先是最新的 行载 `trace_id` 当日志是相互关联的; `withAttributes` 添加每个属性.
- `signoz_search_traces`: 最新跨度由 `service`, (中文). `operation` (跨度名称), `errorsOnly`, (中文). `minDurationMs` 和
  `filter`,最先更新或最慢`orderBy`) (中文(简体) ). `fields` 为每行添加属性。
- `signoz_get_trace`:一个微量作为瀑布,具有根服务,跨度和误差计数,每个跨度的深度,持续时间和关键HTTP/DB属性,及其例外.

## 查询

`signoz_query` 在跟踪、日志或衡量标准上运行构建者查询,并附有公式,或a PromQL 查询:同样的查询仪表盘面板运行。 `requestType` 选择形状 :

- `time_series` (默认):每个序列被归纳为分钟,最大,平均,最后值和高峰时间. `withPoints` 每系列加60分; `stepSeconds` 设置桶大小。
- `scalar`:每组一行.
- `raw`:行经.

用它来调查一个钉子, 并检查一个查询之前把它放在仪表板上。

## 计量

- `signoz_list_metrics`: 窗口中收到带有类型、单位和描述的测量名称。 与 `name`的元数据(类型、时间、单位)。
- `signoz_query_metrics`: 1 公尺 `metric` 与 `timeAggregation` (默认) `rate`· ; `avg` 或 `latest` 以便测量。 `spaceAggregation`
  (默认) `sum`· ; `p50`. . . . ....`p99` 为直方图, `filter` 和 `groupBy` 或者说 `promql` 相反。
