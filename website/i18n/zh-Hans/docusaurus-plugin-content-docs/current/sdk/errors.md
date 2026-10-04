---
sidebar_position: 3
title: 错误
description: "Signoz ApiError)和其他错误课,以及每个课中如何掩盖秘密."
---

# 错误

| 类                          | 何时                                                      |
| --------------------------- | --------------------------------------------------------- |
| `SignozApiError`            | 非-2xx的答复                                              |
| `SignozSessionExpiredError` | 会话旋转被拒绝: 复制新鲜的令牌( 包含 `SignozApiError`页:1 |
| `SignozConfigError`         | 无效配置: 缺少证书、 URL 错误, 两者都是证书               |
| `SignozTimeoutError`        | 内部无答复 `timeoutMs` (每次尝试)                         |

`SignozApiError` 携带 `status`, (中文). `method`, (中文). `path` (没有查询字符串), `operationId`, (中文). `code` (单位:千美元)SigNoz因为
`error.code`,或 `errorType` 在普罗米修斯路上, `type` (单位:千美元)e.g。 。 。 。 `unauthenticated`, (中文). `not-found`)和反应 `body`。 。 。 。

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

## 秘密从不显示

每个错误的信息和 `body` 穿过 `redact`: 诸如 `authorization`, (中文). `apiKey`, (中文). `accessToken` 或 `refreshToken` 成为
`***`,客户端本身的代号或密钥的任何字迹发生,字符串内部也一样. `redact` 为您自己的日志导出 :

```ts
import { redact } from "@hoyasumii/signoz";

console.log(redact(payload, [process.env.SIGNOZ_API_KEY!]));
```
