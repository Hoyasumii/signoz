---
sidebar_position: 6
title: 通用工具
description: "signoz_resources, (中文). signoz_describe 和 signoz_call: 系统的其他操作 SigNoz 爱普。"
---

# 通用工具

配制的工具包括遥测、警报和仪表板。 对于其他一切(保存的视图,通知通道,停机时间,服务账户,用户,. )有三种工具到达了REST API的其他~230操作.

1. **`signoz_resources`** 列出服务及其操作。 与一个 `query` (单位:千美元)e.g。 。 。 。 `saved view`, (中文). `downtime`, (中文).
   `notification channel`),只有对应的.
2. **`signoz_describe`** 给出一个操作的完整签名:路径和查询参数、机体计划、它所需要的权限和一个示例 `signoz_call` 输入。 与 `schema`,它从光谱中扩展了一个图案(`depth` 深层,默认值
   3。
3. **`signoz_call`** 运行它 : `operation` 这是 `service.method` (单位:千美元)`savedView.createSavedView`)或 `operationId`
   (单位:千美元)`CreateSavedView`),以及 `args` 持有 `path`, (中文). `query` 和 `body`。 。 。 。

```json
{ "operation": "rules.listRules", "args": {} }
```

## 安全问题

- 未知参数被拒绝,所以一个typo不会默默地丢弃一个过滤器.
- 破坏操作(删除、撤销、断开、解锁) `confirm: true`特工被告知先问你
- 会话生命周期操作,SSO召回和原始导出都被排除在目录之外.
- 一个很长的答案是切到6万个字符,这么说.

该目录由与SDK相同的OpenAPI spec生成(`pnpm codegen:mcp`) (中文(简体) ).
