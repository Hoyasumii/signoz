---
sidebar_position: 2
title: 设置
description: "保存一次设置并注册 SigNoz MCP 服务器在 Claude Code, (中文). Codex 和 OpenCode。 。 。 。"
---

# 设置

## 快速前进

保存您的设置一次, 然后让 CLI 在它找到的客户端中注册服务器 :

```bash
npx signoz mcp config    # asks for the instance URL, an API key (or the browser tokens), an environment and a port
npx signoz mcp install   # finds Claude Code, Codex and OpenCode on your PATH and registers signoz-mcp (stdio)
```

`install` 显示它找到的客户的核对表。 选中您想要的, 它通过每个客户端的 CLI 注册服务器, 名称为 `signoz`。注册命令在客户端启动时读取保存的配置,所以没有证书最终会出现在客户端的配置中. 见
[`signoz mcp install`](../cli/mcp-commands.md#signoz-mcp-install) 为旗帜。

## 通过手: stdio

让客户开始 `signoz-mcp`它读取保存的配置,所以客户端配置不需要密钥 :

```json
{
  "mcpServers": {
    "signoz": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/signoz", "signoz-mcp"] }
  }
}
```

内 Claude Code编号 :

```bash
claude mcp add signoz -- npx -y -p @hoyasumii/signoz signoz-mcp
```

没有保存的配置,或者要覆盖它,给客户端一个 `env` 块为 `SIGNOZ_BASE_URL` 和 `SIGNOZ_API_KEY` (见 [配置](./configuration.md):

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

## 亲手: HTTP

在背景中运行一个服务器,并将客户端指向它的URL:

```bash
npx signoz mcp start          # prints the URL, http://127.0.0.1:3767/mcp by default
claude mcp add --transport http signoz http://127.0.0.1:3767/mcp
```

没有CLI, `signoz-mcp --http` 以环境或保存的配置设置在前景中运行 。 `signoz-mcp --help` 列出旗帜。 要在每次登录时启动服务器, 请运行 `npx signoz mcp boot enable`
(见 [`signoz mcp boot`](../cli/mcp-commands.md#signoz-mcp-boot)) (中文(简体) ).

## 检查它的工作

叫你的经纪人打电话 `signoz_whoami`,或从终端运行它:

```bash
npx signoz whoami
```

它回答实例 URL, 认证模式, 用户或服务账户, 以及 SigNoz 版本 SDK 镜像和默认环境.
