---
sidebar_position: 5
title: 板
description: "构建 SigNoz 預置的儀表板和你自己的面板 SigNoz 在拯救一切之前"
---

# 板

`signoz_create_dashboard` 在 SigNoz'v2格式 (Perses, `schemaVersion: "v6"`在12列的网格上 回答它 `url`.

## 預置

- `api_red`: 要求、 錯誤率、 p50/ p95/ p99 暫時性、 按狀態的要求、 最失敗和最近失敗的要求的端點 。 建于服務的入口跨度( U)`kind_string = 'Server'`,可在 `filter`;
  `routeAttribute` 命名端點( 預設值 ) `http.route`).
- `worker_failures`: 每個工作的运行與失敗, p95 期限, 每份工作表, 最新的失敗與錯誤紀錄 。 `filter` 選擇工作跨度( R)e.g. `name LIKE 'job.%'`),和
  `jobAttribute` 命名他們的屬性( 預設跨度名稱) 。
- `logs_errors`: 按重度和最新行分列的错误/肺结核。

每個預置需要一個 `service`,可選擇 `environment` 和 a `title`.

## 你自己的面板

`sections` 保持自己的路段(每行相撞, `title`前 `panels`:

| 外勤                   | 為什麼                                                          |
| ---------------------- | --------------------------------------------------------------- |
| `title`, `description` | 面板頭                                                          |
| `kind`                 | `timeseries`, `bar`, `number`, `table`, `pie`, `list` 或 `text` |
| `queries`, `formulas`  | 构建器查詢( A, B,...) 和公式, 例如 `A / B * 100`                |
| `promql`               | A PromQL 查詢而不是建立者查詢                                   |
| `text`                 | 馬克唐 `text` 面板                                              |
| `unit`                 | `ns`, `ms`, `s`, `percent`, `reqps`, `short`, `bytes`…          |
| `thresholds`           | 行( 時序/ 列) 或顏色規則( 數字 )                                |
| `width`, `height`      | 排出12列和行                                                    |

數個查詢, 或是任何公式, 每面板會做一個综合查詢 。 `list` 面板使用一個建構者查詢, 且沒有集合, 並顯示原始紀錄行或跨度 。

試著先用面板 `signoz_preview_panel`: 它對活體數據執行相同的定義, 并回答面板會顯示的, 或者 SigNoz錯誤

## 儲存前的支票

在儲存前, 每個面板都執行它的查詢 SigNoz (`validate: "run"`完畢 `checkWindow`默认 `1h`). 如果面板失敗, 沒有保存任何東西, 答案說是哪個面板失敗了 。 SigNoz自己的信息。
檢查視窗中沒有資料的面板也列出 。 `dryRun: true` 不救就回答JSON

追蹤與日志面板是建構者查詢, 所以 SigNoz 出价 **檢視追蹤/ 檢視紀錄** 當您按下圖表中的點時, 時距相同 。

## 示例

```bash
signoz list-services --since 24h --search point
signoz create-dashboard --title "Point — API and workers (production)" --tags team:point \
  --presets '[{"preset":"api_red","service":"point-api"},{"preset":"worker_failures","service":"point-worker"},{"preset":"logs_errors","service":"point-api"}]'
```

## 更改和分享

- `signoz_update_dashboard` 與 `mode: "append"` (default) 在现有面板下方新增預置和段落; `mode: "replace"` 從輸入中重建儀表板 。 檢查面板的方式相同。
- `signoz_list_dashboards` 和 `signoz_get_dashboard` 重新讀取`raw: true` 全部JSON。
- `signoz_share_dashboard` 透過公開連結, 任何有連結的人都能看到它的數據 所以它需要 `confirm: true`在組織內共享不需要呼叫:傳送儀表網址。
