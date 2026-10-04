---
sidebar_position: 4
title: 警告
description: "發射警報 警報規則 當規則發射並解決的時候"
---

# 警告

| 工具                  | 答案是什么                                                                       |
| --------------------- | -------------------------------------------------------------------------------- |
| `signoz_list_alerts`  | 正在使用的警報( 發射或靜音) : 名稱、 嚴重性、 從何時起、 概要與標籤              |
| `signoz_list_rules`   | 每條規則: id, name, state( firring/ notactive/ disabled), 嚴重性, 類型和评价視窗 |
| `signoz_get_rule`     | 一個完全規則:其條件( 焦點和阈值) 、 標籤、 註解和頻道                            |
| `signoz_rule_history` | 當一個規則在視窗( 時線) 中發射並解析時, 總和                                     |

`signoz_list_alerts` 和 `signoz_list_rules` 采取 `search` 文字; `signoz_list_rules` 也使用 `state`. `signoz_rule_history` 照規矩行事
`id` 和窗口( E)`since`,或 `start`/`end`),它會用它發出的警報來排隊。

建立、 變更或靜音規則、 頻道及關閉時間都經過 [一般工具](./generic-tools.md): `signoz_resources` 與 `rules`, `channels` 或 `downtime` 找到行動
