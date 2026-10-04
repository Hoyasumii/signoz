---
sidebar_position: 7
title: 配置
description: "服务器和 CLI 读取的设置, 保存的位置, 以及解决顺序 。"
---

# 配置

每个设置来自旗帜,然后是环境,然后是文件 `signoz mcp config` 保存,然后是默认值。

| 变量                        | 为什么                                                      |
| --------------------------- | ----------------------------------------------------------- |
| `SIGNOZ_BASE_URL`           | 实例 URL                                                    |
| `SIGNOZ_API_KEY`            | 一个服务账户 API 密钥                                       |
| `SIGNOZ_AUTH_TOKEN`         | 与 `SIGNOZ_REFRESH_AUTH_TOKEN`: 浏览器会话, 而不是 API 密钥 |
| `SIGNOZ_REFRESH_AUTH_TOKEN` | 会话的更新符号                                              |
| `SIGNOZ_ENV`                | 那个 `deployment.environment` 默认情况下的遥测工具过滤器    |
| `PORT`                      | HTTP 端口( 默认3767)                                        |
| `SIGNOZ_CONFIG`             | 保存的配置所居住的地方( 也) `--config`页:1                  |

当一个API密钥和一个令牌对同时设定时,API密钥获胜. 见 [认证](../sdk/authentication.md) 每一个来自哪里。

## 在它保存的地方

- `~/.config/signoz/.env` 在 Linux 上;
- `~/Library/Application Support/signoz/.env` 关于macOS的;
- `%APPDATA%\signoz\.env` 窗口上;
- 或在何处 `SIGNOZ_CONFIG`页:1`--config` 点。

文件是用0600模式(在Windows上文件夹的ACL保护它)写的. 有了浏览器符号后,旋转的对子会转到 `session.json` 旁边 `.env`,由stdio,守护进程和CLI共享.

秘密从不出现在错误和日志中 `--help` 或配置表单。
