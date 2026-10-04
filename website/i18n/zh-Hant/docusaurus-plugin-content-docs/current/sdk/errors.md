---
sidebar_position: 3
title: 錯誤
description: "Signoz ApiError 和其他錯誤的課程,"
---

# 錯誤

| 類別                        | 什麼時候                                           |
| --------------------------- | -------------------------------------------------- |
| `SignozApiError`            | 非-2xx 回复                                        |
| `SignozSessionExpiredError` | 會議旋轉被拒絕: 复制新令牌( 包含 `SignozApiError`) |
| `SignozConfigError`         | 無效的設定 : 缺少憑證、 網址不正確, 兩種憑證       |
| `SignozTimeoutError`        | 內部沒有回應 `timeoutMs` (每次試試)                |

`SignozApiError` 載 `status`, `method`, `path` (沒有查詢字串), `operationId`, `code` (SigNoz是 `error.code`,或 `errorType`
在普羅米修斯路上, `type` (e.g. `unauthenticated`, `not-found`和答复 `body`.

```ts
import { SignozApiError } from "@hoyasumii/signoz";

try {
  await signoz.dashboard.getDashboardV2({ path: { id: "missing" } });
} catch (error) {
  if (error instanceof SignozApiError && error.status === 404) {
    // …
  } else throw error;
}
```

## 秘密從不顯示

每一個錯誤的訊息和 `body` 過去 `redact`: 金鑰的數值, 例如 `authorization`, `apiKey`, `accessToken` 或 `refreshToken` 成為 `***`,
任何字面上的客戶端的代碼或金鑰, 內線也一樣 。 `redact` 匯出為您自己的紀錄 :

```ts
import { redact } from "@hoyasumii/signoz";

console.log(redact(payload, [process.env.SIGNOZ_API_KEY!]));
```
