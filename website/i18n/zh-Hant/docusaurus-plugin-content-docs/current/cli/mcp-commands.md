---
sidebar_position: 2
title: 先生 mcp
description: "signoz mcp: 儲存設定, 在背景中執行伺服器, 在登入時啟動, 並登入您的 MCP 客戶端 。"
---

# `signoz mcp`

`signoz mcp` 為您管理 MCP 伺服器: 已儲存的設定、 背景 HTTP 伺服器、 登入服務、 以及您 MCP 客戶端的注册 。

```bash
npx signoz mcp config                 # asks for the settings in the terminal and saves them
npx signoz mcp config --env production --port 4000   # no prompts (scripts, CI): saves just these, keeps the rest
npx signoz mcp config --web           # the same, in a local web form
npx signoz mcp install                # pick Claude Code / Codex / OpenCode and register signoz-mcp (stdio) in them
npx signoz mcp install --client claude,opencode --force   # no picker (scripts, CI); --force replaces an entry
npx signoz mcp uninstall              # pick the clients to remove the 'signoz' entry from (no saved config needed)
npx signoz mcp start                  # start in the background (needs a saved config); prints the URL for `claude mcp add`
npx signoz mcp start --api-key other --port 4000   # one-off values, never saved
npx signoz mcp status                 # running or stopped (exit 3), URL, pid, uptime
npx signoz mcp stop
npx signoz mcp boot enable            # start at every login; `boot disable` / `boot status`
```

## `signoz mcp config`

寫入已儲存的 `.env` ([配置](../mcp/configuration.md)). 它有三种作用:

- **在终端** (缺省). 從儲存的數值開始, 密件被打入遮罩: 輸入時保留保存的 。 `-` 清除它。
- **有旗子的** 如果有任何 `--base-url`, `--api-key`, `--auth-token`, `--refresh-auth-token`, `--env` 或 `--port`什麼都不要 也只救那些
  沒有終點,它需要它們。 當旗子傳來的秘密 留在你的貝殼史上 所以更喜歡盡快
- **以網絡形式** 與 `--web`: 在瀏覽器中開啟的本地頁面( U)`--no-open` 。 空白的秘密保留了保存的那個

如果伺服器在執行, 它會說: 重新啟動它來取取變更 。 `--config <file>` (或) `SIGNOZ_CONFIG`) 寫另一個檔案 。

## `signoz mcp install`

執行伺服器 `--version`,并通过客戶端自己的 CLI 登入 stdio 伺服器, 名下 `signoz`:

| 客戶端      | 命令它執行                  |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

註冊的指令是 `node <package>/dist/mcp/cli.js` 根據絕對路徑, 沒有憑證: 伺服器在客戶端發射時會讀取已儲存的檔案( N)`SIGNOZ_CONFIG` 只有當 `--config` 命名另一個檔案 。

找到的客戶都開始勾選 。 一個已經有 `signoz` 標示項目 `already installed, reinstalls` 換掉它 沒有互動终端 `--client` 需要(`claude`, `codex`, `opencode`;
在 WSL 內也 `claude@windows`, `codex@windows`, `opencode@windows`),加 `--force` 取代項目。 `--dry-run` 打印命令而不是執行。

都 `install` 和 `uninstall` 工作於每個客戶端的使用者關卡( 全球) 配置 。 專案目錄從不觸碰 。

## `signoz mcp uninstall`

用 `signoz` 項目,顯示是否為 `stdio` 或 `http`,并移除此名稱的任何項目 : `claude mcp remove -s user`, `codex mcp remove`和用于 OpenCode (沒有)
`remove`) 編輯其全局設定檔, 只刪除此金鑰, 保留註解與佈局 。

也是唯一的命令 `signoz mcp config` 操作時沒有儲存的設定, 所以在設定消失後可以清理客戶端 。 `--client` 和 `--dry-run` 工作 `install`.

## `signoz mcp start`, `stop` 和 `status`

`start` 執行 HTTP 伺服器脫離, 其pid和登入 `<config dir>/run/`,并打印其 URL、日志檔和 `claude mcp add` 要登入的行。 它需要保存的配置 。 `--api-key`,
`--base-url`, `--env` 和 `--port` 重覆它只為此跑步, 而且永遠不會被儲存 。 `--foreground` 取代目前的流程。

`status` 列印伺服器是否在執行, 以及它的 URL、 pid 和 optime , 并在不執行時用代碼 3 退出 。 `stop` 要求伺服器通過代碼保護關閉 `POST /shutdown`,並在失敗時指示行程。

## `signoz mcp boot`

`boot enable` 安裝目前使用者在每次登入時啟動伺服器的服務, 所以不需要 sudo :

| OS       | 服務                                                 |
| -------- | ---------------------------------------------------- |
| Linux 中 | 系統使用者單位( 在 WSL 上, 啟用系統 `/etc/wsl.conf`) |
| macOS    | a 發射代理                                           |
| 視窗     | 登入工作                                             |

服務只讀取已儲存的設定 。 `boot disable` 移除它 `boot status` 報到
