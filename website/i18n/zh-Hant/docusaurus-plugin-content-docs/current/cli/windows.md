---
sidebar_position: 3
title: 視窗與 WSL
description: "從 PowerShell 或 cmd 使用 Windows 10/11 上的 CLI, 從 WSL 的 Windows 客戶端中登記伺服器 。"
---

# 視窗與 WSL

套件在 Windows 10/11 上執行 Node.js 20或以后,從PowerShell或cmd。

- 設定值檔案居住於 `%APPDATA%\signoz\.env`,受此資料夾的每一個使用者權限(文件模式在Windows上不表示什么)保護。
- `signoz mcp boot enable` 登入登入工作 。
- `signoz mcp stop` 要求伺服器通過代碼保護關閉 `POST /shutdown` 後退以結束它: Windows 上的訊號是 `TerminateProcess`, 它不會讓伺服器關閉 。
- 客戶端 CLI 已執行 `cross-spawn`視窗 `.cmd` shims工作。
- 檔案是通过重覆的重命名寫成的, 因為反病毒與編輯器持續開啟檔案 。

## 從 WSL

當套件安裝在 WSL 內時, `signoz mcp install` 和 `uninstall` 也列出安裝在 Windows 邊上的客戶端, 如 `Claude Code (Windows)`
等`--client claude@windows`). 他們以 `wsl.exe -d <distro> -e node …/dist/mcp/cli.js`,所以它會繼續讀取 WSL 內存的設定。 WSL 已空置後的第一通電話等待
distro 啟動( 一兩秒) 。

Windows 面面已通訊 `powershell.exe`,取自 PATH 或,与 `appendWindowsPath = false`從
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`當它不能達到, `--client claude@windows` 說哪一步失敗了

在 WSL 內登入時啟動伺服器, 開啟系統 `/etc/wsl.conf` 先跑 `npx signoz mcp boot enable`.
