---
sidebar_position: 7
title: 配置
description: "設定伺服器與 CLI 讀取的設定, 它們被儲存的位置, 以及它們被解析的顺序 。"
---

# 配置

每個設定都來自旗子,然後是環境,然後是檔案 `signoz mcp config` 已儲存, 然後是預設值 。

| 變數                        | 為什麼                                                      |
| --------------------------- | ----------------------------------------------------------- |
| `SIGNOZ_BASE_URL`           | 实例 URL                                                    |
| `SIGNOZ_API_KEY`            | 服務帳號 API 金鑰                                           |
| `SIGNOZ_AUTH_TOKEN`         | 用 `SIGNOZ_REFRESH_AUTH_TOKEN`: 瀏覽器片段, 而不是 API 金鑰 |
| `SIGNOZ_REFRESH_AUTH_TOKEN` | 會議的更新符號                                              |
| `SIGNOZ_ENV`                | 其 `deployment.environment` 預設的遥測工具过滤器            |
| `PORT`                      | HTTP 連接埠 (default 3767)                                  |
| `SIGNOZ_CONFIG`             | 保存的配置所在( 也是) `--config`)                           |

API 金鑰與令牌對設定後, API 金鑰會贏 。 看 [認證](../sdk/authentication.md) 每個人的來源

## 保存的地方

- `~/.config/signoz/.env` 在 Linux 上;
- `~/Library/Application Support/signoz/.env` 在 macOS 上;
- `%APPDATA%\signoz\.env` 視窗上;
- 或任何地方 `SIGNOZ_CONFIG`/`--config` 分。

檔案以 0600 模式寫成( 在 Windows 上, 資料夾的ACL 保護它) 。 有了瀏覽器的符號,旋轉的對子會去 `session.json` 旁 `.env`由stdio、deamon和CLI分享。

秘密從來不出現錯誤 日志 `--help` 或配置表單。
