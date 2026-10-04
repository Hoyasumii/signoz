---
sidebar_position: 6
title: 一般工具
description: "signoz_resources, signoz_describe 和 signoz_call: 其它操作 SigNoz 阿里。"
---

# 一般工具

配制的工具包括遥測、警報和儀表板。 其他所有工具(保存的檢視、通知頻道、停機時間、服務帳號、使用者.)有三個工具可以傳達到 REST API 的 ~230 操作。

1. **`signoz_resources`** 列出服務及其操作。 有 `query` (e.g. `saved view`, `downtime`, `notification channel`只有匹配的
2. **`signoz_describe`** 提供一個操作的完整簽名: 路徑與查詢參數, 機體設計, 需要的權限與示例 `signoz_call` 輸入。 用 `schema`,它從光谱中擴展出一個方案(`depth` 深度, 默认值
   3 。
3. **`signoz_call`** 執行它 : `operation` 是 `service.method` (`savedView.createSavedView`或 `operationId`
   (`CreateSavedView`),和 `args` 等待 `path`, `query` 和 `body`.

```json
{ "operation": "rules.listRules", "args": {} }
```

## 安全

- 未知的參數被拒絕, 所以一個字型不會默默地丟下過程 。
- 破解操作( 刪除、 取消、 斷線、 解鎖) `confirm: true`經紀人要先問你
- 會話周期操作、 SSO 召回及原始匯出都從目錄中忽略 。
- 一個很長的答案是六萬個字,

此目錄由與 SDK (SDK) 相同的 OpenAPI spec 產生(`pnpm codegen:mcp`).
