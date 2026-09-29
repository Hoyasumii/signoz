---
sidebar_position: 7
title: Configuration
description: "The settings the server and the CLI read, where they are saved, and the order they are resolved in."
---

# Configuration

Each setting comes from a flag, then the environment, then the file `signoz mcp config` saved, then the default.

| Variable                    | What for                                                                     |
| --------------------------- | ---------------------------------------------------------------------------- |
| `SIGNOZ_BASE_URL`           | The instance URL                                                             |
| `SIGNOZ_API_KEY`            | A service account API key                                                    |
| `SIGNOZ_AUTH_TOKEN`         | With `SIGNOZ_REFRESH_AUTH_TOKEN`: the browser session, instead of an API key |
| `SIGNOZ_REFRESH_AUTH_TOKEN` | The session's refresh token                                                  |
| `SIGNOZ_ENV`                | The `deployment.environment` the telemetry tools filter on by default        |
| `PORT`                      | The HTTP port (default 3767)                                                 |
| `SIGNOZ_CONFIG`             | Where the saved configuration lives (also `--config`)                        |

When both an API key and a token pair are set, the API key wins. See [Authentication](../sdk/authentication.md)
for where each comes from.

## Where it is saved

- `~/.config/signoz/.env` on Linux;
- `~/Library/Application Support/signoz/.env` on macOS;
- `%APPDATA%\signoz\.env` on Windows;
- or wherever `SIGNOZ_CONFIG`/`--config` points.

The file is written with mode 0600 (on Windows the folder's ACL protects it). With the browser tokens, the rotated
pair goes to `session.json` beside the `.env`, shared by stdio, the daemon and the CLI.

Secrets never show up in errors, logs, `--help` or the configuration form.
