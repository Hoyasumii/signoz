<div align="center">

# @hoyasumii/signoz

**TypeScript SDK for the [SigNoz](https://signoz.io) REST API, with an MCP server (stdio and HTTP) and a CLI.**

[![SigNoz](https://img.shields.io/badge/SigNoz-v0.142.1-e75536)](https://github.com/SigNoz/signoz/releases/tag/v0.142.1)
[![Operations](https://img.shields.io/badge/operations-241%2F241-2ea44f)](spec/openapi.v0.142.1.yml)
[![Node](https://img.shields.io/badge/Node-%E2%89%A520-5fa04e?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Windows](https://img.shields.io/badge/Windows-native%20%2B%20WSL-0078d4)](#windows)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

**Documentation: [hoyasumii.github.io/signoz](https://hoyasumii.github.io/signoz/)** (English and Português),
also as [`llms.txt`](https://hoyasumii.github.io/signoz/llms.txt) for LLMs. `signoz docs` opens it.

| Page                                                                 | What it covers                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Getting started](https://hoyasumii.github.io/signoz/docs/intro)     | installation, versions, the first calls                             |
| [SDK](https://hoyasumii.github.io/signoz/docs/sdk/overview)          | the client, responses, authentication, errors                       |
| [MCP server](https://hoyasumii.github.io/signoz/docs/mcp/overview)   | transports, every tool, dashboards, configuration, programmatic use |
| [CLI](https://hoyasumii.github.io/signoz/docs/cli/overview)          | tools as commands, `signoz mcp`, Windows and WSL                    |
| [API reference](https://hoyasumii.github.io/signoz/docs/api)         | every exported class, type and function, generated from the source  |
| [Contributing](https://hoyasumii.github.io/signoz/docs/contributing) | building, testing, following a new SigNoz version, this site        |

The site's source is in `website/`: `pnpm docs:dev` previews it.

The package has three layers, laid out like [`@hoyasumii/plane`](https://github.com/Hoyasumii/plane):

1. **SDK.** The 241 operations of the official SigNoz v0.142.1 spec, with one typed method per
   `operationId`. It authenticates with a **service account API key** or with the **browser session's
   tokens**, rotating them automatically.
2. **MCP server** (`@hoyasumii/signoz/mcp`, bin `signoz-mcp`). Runs over stdio or Streamable HTTP on
   `127.0.0.1`.
   - Curated tools for services, logs, traces, metrics and alerts.
   - A dashboard builder that checks every panel against SigNoz before saving.
   - `signoz_resources`/`signoz_describe`/`signoz_call` for the rest of the API.
3. **CLI** (bin `signoz`). An MCP client: every tool becomes a subcommand. `signoz mcp …` configures,
   starts and stops the server, registers it with Claude Code/Codex/OpenCode and starts it at login.

> [!NOTE]
> An independent, **unofficial** project, not affiliated with SigNoz Inc.

The package has its own version; each release mirrors one SigNoz API version. Use the one that matches
your instance (`signoz whoami` shows it as `sdkSignozVersion`, and the SDK exports it as
`SIGNOZ_API_VERSION`):

| `@hoyasumii/signoz` | SigNoz API |
| ------------------- | ---------- |
| 0.1.x               | v0.142.1   |

## Installation

```sh
npm i -g @hoyasumii/signoz     # or: pnpm add -g, or clone + pnpm build + npm i -g .
signoz mcp config              # URL + API key (or browser tokens), saved per user
signoz mcp install             # registers the server (stdio) with Claude Code / Codex / OpenCode
```

## Credentials

- **API key (recommended).** In SigNoz: **Settings → Service Accounts**, create an account with the
  role you need and generate a key. It goes in the `SigNoz-Api-Key` header, does not expire with the
  session and does not compete with your browser for the session.
- **Browser session.** With SigNoz open and logged in, open DevTools → **Application → Local
  Storage** → the SigNoz URL and copy `AUTH_TOKEN` and `REFRESH_AUTH_TOKEN`.
  - A 401 triggers `POST /api/v2/sessions/rotate` and the call is retried.
  - The rotated pair is kept in `session.json`, beside the configuration, and shared by stdio, the
    daemon and the CLI.
  - The session expires after 7 idle days or 30 days in total.
  - With the `opaque` tokenizer, the SDK and the browser compete for the same session. Prefer the API
    key, or log in just for this in a private window.

When both are saved, the API key wins. Secrets never show up in errors, logs, `--help` or the
configuration form.

## SDK

```ts
import { createSignozClient } from "@hoyasumii/signoz";

const signoz = createSignozClient({ baseUrl: "https://signoz.example.com", apiKey: process.env.SIGNOZ_API_KEY! });
// or: createSignozClient({ baseUrl, authToken, refreshAuthToken, tokenStore: new FileTokenStore(".signoz-session.json") })

const me = await signoz.users.getMyUser();
const page = await signoz.dashboard.listDashboardsV2({ query: { limit: 20 } });
const result = await signoz.querier.queryRangeV5({
  body: {
    /* Querybuildertypesv5QueryRangeRequest */
  },
});
```

`createSignozClientFromEnv()` reads `SIGNOZ_BASE_URL` and `SIGNOZ_API_KEY`, or else the
`SIGNOZ_AUTH_TOKEN`/`SIGNOZ_REFRESH_AUTH_TOKEN` pair.

How responses are read:

- A method returns the `data` of the `{status, data}` envelope.
- `void` for 204.
- A streamed `Response` for the raw export.
- The whole object on the Prometheus routes.

A non-2xx becomes a `SignozApiError`, with `status`, `code`, `message`, `operationId` and an already
masked `body`. The timeout is per attempt (`timeoutMs`, default 30s). Routes outside the spec go
through `signoz.request(method, path, { query, body })`. The generator (`pnpm codegen`) and the
response modes are described under [Development](#development).

## MCP server

```sh
signoz-mcp            # stdio: what the MCP client runs
signoz-mcp --http     # http://127.0.0.1:3767/mcp (PORT changes the port)
signoz mcp start      # the same in the background; stop/status; boot enable to start it at login
```

Settings come from the environment (`SIGNOZ_BASE_URL`, `SIGNOZ_API_KEY` or `SIGNOZ_AUTH_TOKEN` +
`SIGNOZ_REFRESH_AUTH_TOKEN`, `SIGNOZ_ENV`, `PORT`), then from the file saved by `signoz mcp config`,
then from the defaults. `SIGNOZ_ENV` sets the `deployment.environment` the tools filter on by
default; `environment: "all"` on a call drops the filter.

The HTTP mode:

- is stateless;
- refuses a `Host` that is not loopback, against DNS rebinding;
- answers `GET /health` with `{ ok, baseUrl, auth, environment, version }`;
- accepts `POST /shutdown` with the token `signoz mcp start` generates, which is how `stop` stops the
  server, Windows included.

### Tools

| Tool                                                                                   | What for                                                                                                               |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `signoz_whoami`                                                                        | Instance, auth mode, user or service account                                                                           |
| `signoz_list_services`                                                                 | Services with spans, errors, error rate and p95: the starting point to find the `service.name`                         |
| `signoz_field_keys` / `signoz_field_values`                                            | Discover attributes (`http.route`, `deployment.environment`, job name…) and their values                               |
| `signoz_search_logs`                                                                   | Logs by service, severity, text and v5 filter, newest first                                                            |
| `signoz_search_traces` / `signoz_get_trace`                                            | Spans by service, operation, error and duration; a trace as a waterfall with its exceptions                            |
| `signoz_query`                                                                         | Builder queries (traces, logs, metrics) with formulas, or PromQL, as `time_series`/`scalar`/`raw`                      |
| `signoz_list_metrics` / `signoz_query_metrics`                                         | Discover metrics and query them                                                                                        |
| `signoz_list_alerts` / `signoz_list_rules` / `signoz_get_rule` / `signoz_rule_history` | Firing alerts, rules and history                                                                                       |
| `signoz_list_dashboards` / `signoz_get_dashboard`                                      | Dashboards and their panels, with a link                                                                               |
| `signoz_preview_panel`                                                                 | Runs a panel definition on real data before saving                                                                     |
| `signoz_create_dashboard` / `signoz_update_dashboard`                                  | Creates or extends a dashboard from presets and/or your own panels                                                     |
| `signoz_share_dashboard`                                                               | Makes the dashboard public (requires `confirm: true`)                                                                  |
| `signoz_resources` / `signoz_describe` / `signoz_call`                                 | The other ~230 operations: saved views, channels, downtimes, service accounts… (destructive ones need `confirm: true`) |

Every telemetry tool takes the window as `since` (`15m`, `6h`, `7d`) or `start`/`end` (ISO or
epoch). A series comes back summarized: min, max, average, last value and the time of the peak. The
points only come with `withPoints`.

### Dashboards

`signoz_create_dashboard` builds the dashboard in the v2 format (Perses, `schemaVersion: "v6"`) from:

- **presets**:
  - `api_red`: requests, error rate, p50/p95/p99 latency, requests by status, the endpoints that fail
    the most, the latest failed requests. Built from the service's entry spans
    (`kind_string = 'Server'`, adjustable in `filter`).
  - `worker_failures`: runs and failures per job, p95 duration, a per-job table, the latest failures
    and error logs. `filter` picks the spans that are jobs, and `jobAttribute` the attribute that names
    them.
  - `logs_errors`: ERROR/FATAL by severity and the latest lines.
- **sections** with your own panels:
  - `timeseries`, `bar`, `number`, `table`, `pie`, `list`, `text`;
  - builder queries with formulas, or PromQL.

Before saving, every panel runs its query on SigNoz (`validate: "run"`). If a panel fails, nothing is
saved, and the response says which panel failed with SigNoz's own message. Panels with no data in the
check window are listed too. `dryRun: true` returns the JSON without saving. The response carries the
dashboard's `url`.

Trace and log panels are builder queries, so SigNoz offers **View traces / View logs** when you click
a point on the chart, over the same interval.

Example, the Point dashboard:

```sh
signoz list-services --since 24h --search point
signoz create-dashboard --title "Point — API and workers (production)" --tags team:point \
  --presets '[{"preset":"api_red","service":"point-api"},{"preset":"worker_failures","service":"point-worker"},{"preset":"logs_errors","service":"point-api"}]'
```

## CLI

```sh
signoz tools                                   # the tools, as commands
signoz search-logs --service point-api --severity ERROR,FATAL --since 30m
signoz get-trace --trace-id 4bf92f3577b34da6a3ce929d0e0e4736
signoz --url http://127.0.0.1:3767/mcp whoami  # against a server already running
```

Without `--url`, the CLI starts the server in its own process. The flags come from each tool's JSON
Schema: arrays take `a,b` or JSON, objects take JSON. `--base-url`, `--api-key` and `--env` apply to
a single run.

Every command except `signoz mcp config`, `signoz mcp uninstall` and help refuses to run until a
configuration with a URL and a credential is saved. The file lives in:

- `~/.config/signoz/.env` on Linux;
- `~/Library/Application Support/signoz/.env` on macOS;
- `%APPDATA%\signoz\.env` on Windows;
- or wherever `SIGNOZ_CONFIG`/`--config` points.

### `signoz mcp`

| Command                        | What it does                                                                                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config`                       | Prompts in the terminal (masked secrets; enter keeps the saved one, `-` clears it). With flags (`--base-url`, `--api-key`, `--auth-token`, `--refresh-auth-token`, `--env`, `--port`) it saves without asking. `--web` opens a local form |
| `start` / `stop` / `status`    | HTTP server in the background, with pid and log in `<config dir>/run/`. `stop` tries `POST /shutdown` before killing the process                                                                                                          |
| `boot enable\|disable\|status` | User service: systemd user unit, LaunchAgent or a logon task on Windows                                                                                                                                                                   |
| `install` / `uninstall`        | Registers or removes `signoz-mcp` (stdio) in Claude Code, Codex and OpenCode, through each one's CLI. `--client`, `--force`, `--dry-run`                                                                                                  |

### Windows

The package runs on Windows 10/11 with Node ≥ 20, from PowerShell or cmd:

- npm/pnpm's `.cmd` shims are run through `cross-spawn`.
- `boot` registers a logon task, and `stop` uses `POST /shutdown`: a signal on Windows is
  `TerminateProcess` and would not let the server shut down.
- Writes use a rename with retries, because antivirus and editors hold files open.
- The `.env` is protected by `%APPDATA%`'s ACL, since file modes do not apply on Windows.

**From WSL.** With the package installed inside WSL, `signoz mcp install` also lists the Windows-side
clients, such as `Claude Code (Windows)` or `--client claude@windows`. They start the server with
`wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, so the server keeps reading the configuration saved in
WSL. The first call with WSL stopped waits for the distro to boot (a second or two).

## Development

```sh
pnpm install          # dependencies and the husky hooks
pnpm build            # tsc → dist/ (CommonJS + .d.ts)
pnpm test:unit        # jest, with a fake SigNoz on node:http
pnpm test:live        # against a real instance (.env.test, from env.example)
pnpm check:types && pnpm check:lint && pnpm check:format && pnpm check:knip
pnpm codegen          # spec/openapi.v<version>.yml → src/generated/ (do not edit by hand)
pnpm codegen:mcp      # spec → src/mcp/generated/catalog.json (the test fails when it is stale)
```

Every script is cross-platform: no `rm`, `$VAR` or `VAR=1 cmd`. `.gitattributes` keeps LF, with
`.cmd`/`.vbs` in CRLF. The husky hooks run lint and format on commit, and types, knip
and unit tests on push. Every push to `main` runs `.github/workflows/cd.yml`, which runs the same checks, publishes
`package.json`'s version to npm when it is new and deploys the docs site.

To follow a new SigNoz version:

1. Download the tag's `docs/api/openapi.yml` into `spec/`.
2. Change `signozVersion` in `package.json`, bump `version` and add a row to the compatibility table.
3. Run `pnpm codegen && pnpm codegen:mcp`.

## License

MIT.
