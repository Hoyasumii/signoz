---
sidebar_position: 1
title: 概述
description: "其 SigNoz 客戶端 : 每一次操作都使用一個輸入方法, 按標籤組成, 以及回應與錯誤如何出現 。"
---

# SDK

```ts
import { createSignozClient } from "@hoyasumii/signoz";

const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });

const me = await signoz.users.getMyUser();
const page = await signoz.dashboard.listDashboardsV2({ query: { limit: 20 } });
const result = await signoz.querier.queryRangeV5({
  body: {
    /* Querybuildertypesv5QueryRangeRequest */
  },
});
```

`baseUrl` 是實體 URL, 如果它有它的基准路徑( N)`https://example.com/signoz`). 客戶端由 `spec/openapi.v0.142.1.yml`: 每一個 spec 標籤的服務(
O)`signoz.dashboard`, `signoz.rules`, `signoz.querier`,)和每方一种方法 `operationId`。 `{ path, query, body }` 如操作宣告, 從 spec's
輸入 `components["schemas"]`.

`createSignozClientFromEnv()` 已讀 `SIGNOZ_BASE_URL` 和 `SIGNOZ_API_KEY`,或者 `SIGNOZ_AUTH_TOKEN`/`SIGNOZ_REFRESH_AUTH_TOKEN`
配對 (參考) [認證](./authentication.md)).

## 選項

| 選擇        | 為什麼                                            |
| ----------- | ------------------------------------------------- |
| `baseUrl`   | 實例網址( 需要)                                   |
| `apiKey`    | 服務帳號 API 金鑰                                 |
| `authToken` | 用 `refreshAuthToken`: 瀏覽器片段而不是 API 金鑰  |
| `timeoutMs` | 每一次試試超時, 預設30000; `0` 或 `Infinity` 關掉 |
| `fetch`     | 替代方案 `fetch` (測試,代理)                      |

每一種方法也都有第二次爭論 `RequestOptions`: `timeoutMs` 為了那個呼叫,a `signal` 取消, 附加 `headers`和 `raw: true` 要得到 `Response` 未解析( 非-2xx
仍扔) 。

## 答复

方法如何回答取决于操作:

- 该 `data` 主席 `{ status, data }` 對他們大多數人來說,
- `void` 204美元;
- 串流 `Response` 用于原始出口;
- 普羅米修斯路線上的整個物件(`{ status, data, warnings, infos }`).

非-2xx变为 a `SignozApiError` (看 [錯誤](./errors.md)).

## 光谱以外的路徑

`signoz.request(method, path, { query, body })` 呼叫任何與客戶端認證相關的路徑, 將會話旋轉為 401 , 像任何產生的方法一樣 。

## 套件的匯出

- `OPERATIONS` 和 `OPERATION_METHODS`: 每個操作的方法、路徑、回應模式及其是否驗證, by `operationId`.
- `SIGNOZ_API_VERSION`: 其 SigNoz 版本客戶端鏡像 。
- 單位的類型 : `components`, `operations`, `paths`.

每一個匯出類別, 類型和函數, 請參考 [API 參考](pathname://../../docs/api).
