---
sidebar_position: 1
title: 開始
description: "A TypeScript SDK 表示 SigNoz API, 有一個 MCP 伺服器和CLI 建在它上: 每個部件都做什麼, 如何安裝它 。"
slug: /intro
---

# 開始

`@hoyasumii/signoz` 是 TypeScript SDK 表示 [SigNoz](https://signoz.io) RIST API,上面有MCP伺服器和CLI。 從代碼、 AI 代理或您的端口使用 :
三者共用同一客戶端 。

- **SDK**241次操作 SigNoz v0.142.1 spec, 每一個輸入方法 `operationId`。它用服務帳號 API 金鑰或瀏覽器會話的代碼來驗證, 并为您旋轉 。 起始
  [SDK](./sdk/overview.md).
- **MCP 伺服器** (`@hoyasumii/signoz/mcp`,本 `signoz-mcp`: stdio 或 流式 HTTP 上 `127.0.0.1`檢查每張面板的圖片 SigNoz 其它的 API 通用工具。 起始
  [MCP 伺服器](./mcp/overview.md).
- **中央LI** (`signoz`: 每個 MCP 工具作為子指令, 加上 `signoz mcp` 要設定伺服器, 在背景中執行, 在登入時啟動並登入 Claude Code, Codex 和 OpenCode起始于
  [中央LI](./cli/overview.md).

這是獨立的, **非官方** 專案, 不隶属于 SigNoz 公司

## 安裝

需要 Node.js 二十或后.

```bash
npm i -g @hoyasumii/signoz     # or: pnpm add -g @hoyasumii/signoz
signoz mcp config              # the instance URL and an API key (or the browser tokens), saved per user
signoz mcp install             # registers the server (stdio) in Claude Code / Codex / OpenCode
```

作為圖書館 `npm install @hoyasumii/signoz`.

## 版本

套件有自己的版本; 每一個放出鏡面 SigNoz API版本. 用符合你案例的 `signoz whoami` 顯示為 `sdkSignozVersion`, SDK 匯出為 `SIGNOZ_API_VERSION`.

| `@hoyasumii/signoz` | SigNoz API |
| ------------------- | ---------- |
| 0.1.x               | v0.142.1   |

## 第一通電話

```ts
import { createSignozClient } from "@hoyasumii/signoz";

const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
const me = await signoz.users.getMyUser();
```

從終點站,一次 `signoz mcp config` 已儲存設定 :

```bash
signoz whoami
signoz list-services --since 24h
```

`signoz docs` 開啟此網站 。
