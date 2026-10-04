---
sidebar_position: 2
title: 設定
description: "儲存您的設定值一次並登記 SigNoz MCP 伺服器在 Claude Code, Codex 和 OpenCode."
---

# 設定

## 快速的路

儲存您的設定值一次, 然后讓 CLI 在它找到的客戶端中登記伺服器 :

```bash
npx signoz mcp config    # asks for the instance URL, an API key (or the browser tokens), an environment and a port
npx signoz mcp install   # finds Claude Code, Codex and OpenCode on your PATH and registers signoz-mcp (stdio)
```

`install` 顯示它找到的客戶清單 。 勾選您想要的, 它會通過每個客戶端的 CLI 登記伺服器, 名為 `signoz`。註冊的指令在客戶端啟動時會讀取儲存的設定, 所以沒有憑證會在客戶端的設定中結束 。 看
[`signoz mcp install`](../cli/mcp-commands.md#signoz-mcp-install) 為了旗子

## 按手: stdio

讓客戶端開始 `signoz-mcp`。它會讀取儲存的設定, 所以客戶端配置不需要按鍵 :

```json
{
  "mcpServers": {
    "signoz": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/signoz", "signoz-mcp"] }
  }
}
```

在 Claude Code:

```bash
claude mcp add signoz -- npx -y -p @hoyasumii/signoz signoz-mcp
```

沒有儲存的設定, 或是要覆蓋它, 給客戶端一個 `env` 區塊 `SIGNOZ_BASE_URL` 和 `SIGNOZ_API_KEY` (看 [配置](./configuration.md):

```json
{
  "mcpServers": {
    "signoz": {
      "command": "npx",
      "args": ["-y", "-p", "@hoyasumii/signoz", "signoz-mcp"],
      "env": { "SIGNOZ_BASE_URL": "https://signoz.example.com", "SIGNOZ_API_KEY": "your-api-key" }
    }
  }
}
```

## 手: HTTP

在背景中執行一個伺服器, 將您的客戶端指向它的網址 :

```bash
npx signoz mcp start          # prints the URL, http://127.0.0.1:3767/mcp by default
claude mcp add --transport http signoz http://127.0.0.1:3767/mcp
```

沒有CLI, `signoz-mcp --http` 以環境的設定或儲存的設定在前景中執行 。 `signoz-mcp --help` 列出旗子。 每次登入時啟動伺服器, 執行 `npx signoz mcp boot enable` (看
[`signoz mcp boot`](../cli/mcp-commands.md#signoz-mcp-boot)).

## 檢查有用

叫你的經紀人打電話 `signoz_whoami`,或從終點執行它:

```bash
npx signoz whoami
```

它會回答實例 URL, 驗證模式, 使用者或服務帳號, 以及 SigNoz 版本 SDK 鏡頭與默认環境 。
