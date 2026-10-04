---
sidebar_position: 2
title: 認證
description: "服務帳號 API 金鑰, 或是瀏覽器會話的代碼, 以及自動旋轉和代碼檔案 。"
---

# 認證

客戶收下 **或** API 金鑰 **或** 瀏覽器值對 。 都過去了 `SignozConfigError`.

## API 金鑰( 建議)

在 SigNoz開啟 **設定 ~ 服務帳號**,以您需要的角色建立帳號,并產生按鍵。

```ts
const signoz = createSignozClient({ baseUrl, apiKey: process.env.SIGNOZ_API_KEY! });
```

鑰匙放進去 `SigNoz-Api-Key` 信頭( 匯出為 `API_KEY_HEADER`). 它不以會話到期, 也不與您的瀏覽器競爭 。

## 瀏覽器階段

用 SigNoz 開啟並登入, 開啟 DevTools + **應用程式 ~ 本地儲存** → SigNoz 網址與副本 `AUTH_TOKEN` 和 `REFRESH_AUTH_TOKEN`.

```ts
import { createSignozClient, FileTokenStore } from "@hoyasumii/signoz";

const signoz = createSignozClient({
  baseUrl,
  authToken: process.env.SIGNOZ_AUTH_TOKEN!,
  refreshAuthToken: process.env.SIGNOZ_REFRESH_AUTH_TOKEN!,
  tokenStore: new FileTokenStore(".signoz-session.json"),
});
```

- 每次打來 `Authorization: Bearer <authToken>`.
- 401扳機 `POST /api/v2/sessions/rotate` 接電話一次 旋轉為單飛: 同步呼叫,
- 拒絕的旋轉 `SignozSessionExpiredError`: 從瀏覽器复制新代碼 。
- 7天或共30天后。
- 與 `opaque` 代碼器、 SDK 和瀏覽器爭取相同的片段 。 优先使用 API 鍵, 或是在私人視窗中登入 。

### 保持旋轉對對

旋轉的對子在內存中存在, 除非你保留它 :

- `onTokensRotated(tokens)` 被召來於每一個旋轉者,
- `tokenStore` 你應當堅持它。 `FileTokenStore` 寫入 JSON 檔案, 模式為 0600( 在 Windows 上, 資料夾的ACL 保護它) , 透過重命名來重試, 而其他行程則持有檔案 。

店裡記住被拯救者所降下的雙胞胎。`tokenPairHash`). 下一個開始, 被儲存的對方贏得, 而給定的對方沒有變更, 因為它更新; 一旦你貼上新對, 新對方贏得 。

`createSignozClientFromEnv()` 自行設置,它讓對方保持 `SIGNOZ_TOKEN_FILE` 或 `.signoz-session.json` (`tokenFile: false` 關掉它。

`signoz.auth` 顯示客戶端使用的模式( W)`"api_key"` 或 `"session"`),和 `signoz.tokens` 提供目前的對。
