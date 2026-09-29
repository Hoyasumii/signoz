---
sidebar_position: 2
title: Setup
description: "Save your settings once and register the SigNoz MCP server in Claude Code, Codex and OpenCode."
---

# Setup

## The quick way

Save your settings once, then let the CLI register the server in the clients it finds:

```bash
npx signoz mcp config    # asks for the instance URL, an API key (or the browser tokens), an environment and a port
npx signoz mcp install   # finds Claude Code, Codex and OpenCode on your PATH and registers signoz-mcp (stdio)
```

`install` shows a checklist of the clients it found. Tick the ones you want, and it registers the server through
each client's own CLI, under the name `signoz`. The registered command reads the saved configuration when the
client launches it, so no credential ends up in the client's config. See
[`signoz mcp install`](../cli/mcp-commands.md#signoz-mcp-install) for the flags.

## By hand: stdio

Let the client start `signoz-mcp`. It reads the saved configuration, so the client config needs no keys:

```json
{
  "mcpServers": {
    "signoz": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/signoz", "signoz-mcp"] }
  }
}
```

In Claude Code:

```bash
claude mcp add signoz -- npx -y -p @hoyasumii/signoz signoz-mcp
```

Without a saved configuration, or to override it, give the client an `env` block with `SIGNOZ_BASE_URL` and
`SIGNOZ_API_KEY` (see [Configuration](./configuration.md)):

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

## By hand: HTTP

Run one server in the background and point your clients at its URL:

```bash
npx signoz mcp start          # prints the URL, http://127.0.0.1:3767/mcp by default
claude mcp add --transport http signoz http://127.0.0.1:3767/mcp
```

Without the CLI, `signoz-mcp --http` runs it in the foreground with the settings from the environment or the saved
configuration. `signoz-mcp --help` lists the flags. To start the server at every login, run
`npx signoz mcp boot enable` (see [`signoz mcp boot`](../cli/mcp-commands.md#signoz-mcp-boot)).

## Checking it works

Ask your agent to call `signoz_whoami`, or run it from the terminal:

```bash
npx signoz whoami
```

It answers the instance URL, the auth mode, the user or service account, the SigNoz version the SDK mirrors and
the default environment.
