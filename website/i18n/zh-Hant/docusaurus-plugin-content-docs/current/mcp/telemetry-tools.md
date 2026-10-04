---
sidebar_position: 3
title: 遥測工具
description: "服務、屬性、紀錄、追蹤、建築者和 PromQL 測試和測量:讀取遥測的工具。"
---

# 遥測工具

## 視窗與環境

每個遥測工具都將其視窗當作 `since` (`15m`, `6h`, `7d`; 缺省 `1h`或作 `start`/`end` (ISO 8601或划时代毫秒; `end` 缺省到現在).

用環境过滤的工具增加 `deployment.environment = <SIGNOZ_ENV>` 當設定了預設的環境。 `environment` 在呼叫中另挑一個, `environment: "all"` 放下滤波器。
`signoz_query` 例外: 它只會在您通過時添加過程 `environment`.

使用过滤器 SigNoz'v5 表示式語法 : `service.name = 'point-api' AND has_error = true`.

## 先找到存在的東西

| 工具                   | 答案是什么                                                    |
| ---------------------- | ------------------------------------------------------------- |
| `signoz_list_services` | 在視窗中傳送跨度的服務:跨度,錯誤,錯誤率,p95. `search` 窄      |
| `signoz_field_keys`    | a 的屬性與資源字段名稱 `signal` (`traces`, `logs`, `metrics`) |
| `signoz_field_values`  | 一個字段的值( O)`name`) `search` 和 `existingQuery`           |

用它們來尋找精确 `service.name`, 指定路由或工作以及環境的屬性。

## 日志和追蹤

- `signoz_search_logs`: 最新行 `service`, `severity` (e.g. `["ERROR", "FATAL"]`), `text` (身体的支弦)和 `filter`最新的第一。 行載
  `trace_id` 當日志是相關的; `withAttributes` 新增所有屬性 。
- `signoz_search_traces`: 最新跨度 `service`, `operation` (跨度名稱), `errorsOnly`, `minDurationMs` 和 `filter`,最先或最慢`orderBy`).
  `fields` 新增每行的屬性 。
- `signoz_get_trace`: 一個痕跡作為瀑布, 其根服務、 跨度和錯誤數量、 每個跨度的深度、 期限和關鍵的 HTTP/ DB 屬性及其例外 。

## 查詢

`signoz_query` 將建構者查詢的追蹤器、 紀錄或公尺、 以及公式, 或 a PromQL 查詢: 相同的查詢 。 `requestType` 選擇形状 :

- `time_series` (default): 每個序列被概括為 min, 最大值, 平均值, 最後值和峰值的時間 。 `withPoints` 每系列加60分; `stepSeconds` 設置桶大小。
- `scalar`: 每組一排。
- `raw`: 行.

用它來調查一個突襲,並檢查一個查詢,然后把它放在儀表板上。

## 量度

- `signoz_list_metrics`: 窗口中接收的公尺名稱, 包含型態、 單位和描述 。 用 `name`的元数据(類型、時間性、單位)。
- `signoz_query_metrics`: 1 公尺 `metric` 與 `timeAggregation` (默认) `rate`; `avg` 或 `latest` 以便 `spaceAggregation` (默认)
  `sum`; `p50`...`p99` 至於直方圖, `filter` 和 `groupBy` -或 `promql` 相反。
