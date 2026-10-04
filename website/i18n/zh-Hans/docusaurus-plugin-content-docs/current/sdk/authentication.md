---
sidebar_position: 2
title: 认证
description: "一个服务账户 API 密钥,或者浏览器会话的符号,带有自动旋转和符号文件."
---

# 认证

客户要 **无论是** API 密钥 **或** 浏览器会话的符号对。 两者通过都是 `SignozConfigError`。 。 。 。

## API 密钥( 建议)

内 SigNoz打开 **设置 – 服务账户**并生成密钥。

```ts
const signoz = createSignozClient({ baseUrl, apiKey: process.env.SIGNOZ_API_KEY! });
```

钥匙放进去 `SigNoz-Api-Key` 页眉(导出为 `API_KEY_HEADER`) (中文(简体) ). 它不会随着会话而过期,也不会与您的浏览器竞争。

## 浏览器会话

与 SigNoz 打开并登录,打开 DevTools + **应用程序 − 本地存储** – 报告 SigNoz URL 和副本 `AUTH_TOKEN` 和 `REFRESH_AUTH_TOKEN`。 。 。 。

```ts
import { createSignozClient, FileTokenStore } from "@hoyasumii/signoz";

const signoz = createSignozClient({
  baseUrl,
  authToken: process.env.SIGNOZ_AUTH_TOKEN!,
  refreshAuthToken: process.env.SIGNOZ_REFRESH_AUTH_TOKEN!,
  tokenStore: new FileTokenStore(".signoz-session.json"),
});
```

- 每次打来 `Authorization: Bearer <authToken>`。 。 。 。
- 401个触发器 `POST /api/v2/sessions/rotate` 电话被重审一次 旋转为单飞:同时呼叫,得到401股1旋转.
- 拒绝旋转抛出 `SignozSessionExpiredError`:从浏览器复制新鲜的符号.
- 届会在7天或总共30天之后结束。
- 带着 `opaque` 标致器,SDK和浏览器争夺同一会话. 优先使用 API 密钥, 或者在私人窗口中登录 。

### 保持旋转对

旋转的对子在记忆中存在, 除非你保留它 :

- `onTokensRotated(tokens)` 要求每个旋转, 坚持对自己。
- `tokenStore` 坚持它为你。 `FileTokenStore` 通过一个重命名,在另一个进程持有文件时重试。

店里记着被拯救者从哪一种人那里降下的对子。`tokenPairHash`) (中文(简体) ). 在下一个开始时,被保存的对子获胜,而给定的对子不变,因为它是较新的;一旦你粘上新对子,新对子获胜.

`createSignozClientFromEnv()` 单打独放: 保持对齐 `SIGNOZ_TOKEN_FILE` 或 `.signoz-session.json` (单位:千美元)`tokenFile: false` 关掉它).

`signoz.auth` 说客户端使用哪种模式( N)`"api_key"` 或 `"session"`),以及 `signoz.tokens` 给当前对。
