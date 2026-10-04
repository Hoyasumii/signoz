---
sidebar_position: 1
title: 概览
description: "那个 SigNoz 客户端:每次操作一个打字方法,按标签分类,以及回复和错误如何回来."
---

# SDK 软件

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

`baseUrl` 是实例 URL,如果有其基准路径( )`https://example.com/signoz`) (中文(简体) ). 客户端来自 `spec/openapi.v0.142.1.yml`: 光谱每个标记一个服务(
)`signoz.dashboard`, (中文). `signoz.rules`, (中文). `signoz.querier`,)和每例一种方法 `operationId`。每种方法 `{ path, query, body }`
如操作宣布, 从 spec's 键入 `components["schemas"]`。 。 。 。

`createSignozClientFromEnv()` 读取 `SIGNOZ_BASE_URL` 和 `SIGNOZ_API_KEY`,否则
`SIGNOZ_AUTH_TOKEN`页:1`SIGNOZ_REFRESH_AUTH_TOKEN` 配对(参见 [认证](./authentication.md)) (中文(简体) ).

## 选项

| 选项        | 为什么                                           |
| ----------- | ------------------------------------------------ |
| `baseUrl`   | 实例 URL( 需要)                                  |
| `apiKey`    | 一个服务账户 API 密钥                            |
| `authToken` | 与 `refreshAuthToken`: 浏览器会话而不是 API 密钥 |
| `timeoutMs` | 每次尝试暂停,默认为30000; `0` 或 `Infinity` 关掉 |
| `fetch`     | 替代品 `fetch` (测试,一个代理)                   |

每种方法也都需要第二个论点, `RequestOptions`编号 : `timeoutMs` 为了那个电话,a `signal` 取消, 额外 `headers`,以及 `raw: true` 获取 `Response` 未解析( a
un-2xx still throws).

## 答复

方法如何回答取决于操作:

- 联合国 `data` 会 议 日 程 和 议 程 `{ status, data }` 信封,其中多数信封;
- `void` 204美元;
- 流线 `Response` 用于原出口;
- 普罗米修斯路线上的全部物体(`{ status, data, warnings, infos }`) (中文(简体) ).

非-2xx变为a `SignozApiError` (见 [错误](./errors.md)) (中文(简体) ).

## 光谱以外的路线

`signoz.request(method, path, { query, body })` 调用任何带有客户端认证的路径,像任何生成的方法一样在401上旋转会话.

## 包输出什么

- `OPERATIONS` 和 `OPERATION_METHODS`:每个操作的方法、路径、响应模式以及是否认证,由 `operationId`。 。 。 。
- `SIGNOZ_API_VERSION`编号: SigNoz 版本客户端镜像。
- 光谱类型 : `components`, (中文). `operations`, (中文). `paths`。 。 。 。

对于每个导出类别、类型和功能,请参见 [API 参考](pathname://../../docs/api)。 。 。 。
