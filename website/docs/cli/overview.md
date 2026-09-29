---
sidebar_position: 1
title: CLI overview
description: "The signoz command: every MCP tool as a subcommand, with the tool's input schema as its flags."
---

# CLI

The package installs a `signoz` command. It is an MCP client of the [same server](../mcp/overview.md): every MCP
tool becomes a subcommand, and the tool's input schema becomes its flags. By default the server runs inside the
command, so there is nothing to start first.

```bash
npx signoz mcp config                          # once: the instance URL and an API key (or the browser tokens)
npx signoz tools                               # every command, one per MCP tool
npx signoz whoami
npx signoz list-services --since 24h
npx signoz search-logs --service point-api --severity ERROR,FATAL --since 30m
npx signoz search-traces --service point-api --errors-only --min-duration-ms 500
npx signoz get-trace --trace-id 4bf92f3577b34da6a3ce929d0e0e4736
npx signoz resources --query "saved view"
npx signoz call --operation rules.listRules
```

Nothing but `--help`, `--version`, `signoz docs`, `signoz mcp config` and `signoz mcp uninstall` runs until a
configuration with a URL and a credential is saved. `signoz docs` prints the link to this site and opens it in the
browser.

## From tools to commands

- The command is the tool's name without `signoz_`, in kebab-case: `signoz_search_logs` → `search-logs`.
- Each flag is an input in kebab-case: `traceId` → `--trace-id`, `errorsOnly` → `--errors-only`.
- Array flags take `a,b` or JSON, object flags take JSON, and boolean flags need no value.
- `signoz <command> --help` lists a command's flags, with the allowed values of enum inputs.

Tool output goes to stdout. A tool error goes to stderr with exit code 1.

## One-off settings and a running server

`--base-url`, `--api-key` and `--env` override the environment and the saved file for one run of the in-process
server. To use a `signoz-mcp` that is already running over HTTP instead, pass `--url http://127.0.0.1:3767/mcp` or
set `SIGNOZ_MCP_URL`. These flags work anywhere on the command line.

None of them stands in for the saved configuration: the CLI refuses to run tools without it, even when `--url` or
`--api-key` is given.

## Managing the server

`signoz mcp` is intercepted before any connection is made. It configures the server, runs it in the background,
starts it at login and registers it in your MCP clients. See [`signoz mcp`](./mcp-commands.md).
