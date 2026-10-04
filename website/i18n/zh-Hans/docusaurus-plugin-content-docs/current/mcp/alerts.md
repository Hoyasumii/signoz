---
sidebar_position: 4
title: 警报
description: "发射警报,警报规则 当规则发射和解决。"
---

# 警报

| 工具                  | 它的答案是什么                                                      |
| --------------------- | ------------------------------------------------------------------- |
| `signoz_list_alerts`  | 正在激活的警报(已发射或已沉默):名称、严重程度、自何时起、摘要和标签 |
| `signoz_list_rules`   | 每项规则:ID、名称、状态(火/不活动/残疾)、严重程度、类型和评价窗口   |
| `signoz_get_rule`     | 一条完整规则:条件(管道和门槛)、标签、说明和渠道                     |
| `signoz_rule_history` | 当规则在窗口( 时间线) 中开火并解决时, 总计                          |

`signoz_list_alerts` 和 `signoz_list_rules` 带一个 `search` a. 文本; `signoz_list_rules` 还需要一个 `state`。 。 。 。
`signoz_rule_history` 照规矩办事 `id` 和窗口(`since`,或 `start`页:1`end`),这与它提高的警示一致。

创建、改变或压制规则、频道和停机时间都经过 [通用工具](./generic-tools.md)编号 : `signoz_resources` 与 `rules`, (中文). `channels` 或 `downtime` 找到行动
