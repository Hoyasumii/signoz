---
sidebar_position: 3
title: 窗口和 WSL
description: "使用来自PowerShell或cmd的Windows 10/11上的CLI,并在WSL的Windows客户端中注册服务器."
---

# 窗口和 WSL

软件包运行在 Windows 10/11 上 Node.js 20岁或以后,从PowerShell或cmd.

- 文件设置在 `%APPDATA%\signoz\.env`,由该文件夹的每个用户权限(文件模式在Windows上意味着什么)保护。
- `signoz mcp boot enable` 注册登录任务。
- `signoz mcp stop` 请服务器通过代号守护关闭 `POST /shutdown` 返回到终止前: Windows 上的信号是 `TerminateProcess`,不会让服务器关闭。
- 客户端 CLI 运行通过 `cross-spawn`窗口 `.cmd` shims的工作原理。
- 文件是通过一个重试的重命名来写入的,因为反病毒和编辑器持有文件打开.

## 从 WSL

当软件包安装在WSL内部时, `signoz mcp install` 和 `uninstall` 并列出安装在 Windows 侧的客户端, 如 `Claude Code (Windows)` 等 (中文(简体)
).`--client claude@windows`) (中文(简体) ). 他们启动服务器 `wsl.exe -d <distro> -e node …/dist/mcp/cli.js`,因此它不断读取WSL内部保存的配置.
WSL闲置后的第一个呼叫等待distro启动(一秒或两秒).

Windows 侧面通过 `powershell.exe`,取自路径,或,与 `appendWindowsPath = false`从
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`当无法达到时, `--client claude@windows` 说哪一步失败了

要在 WSL 内登录启动服务器, 启用系统 `/etc/wsl.conf` 首先,然后运行 `npx signoz mcp boot enable`。 。 。 。
