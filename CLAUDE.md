# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@hoyasumii/signoz` — a TypeScript SDK for the SigNoz REST API (v0.142.1, 241 operations), an MCP
server over it (stdio and Streamable HTTP) and a CLI that is an MCP client. Node >= 20, CommonJS
through `tsc`, pnpm. It mirrors `@hoyasumii/plane` (`../plane`): the MCP/CLI layers were ported from
there and follow its design, including its Windows support
(`../plane/docs/superpowers/specs/2026-09-25-windows-support-design.md`).

## Common Commands

```bash
pnpm install              # Install dependencies (and the husky hooks)
pnpm build                # tsc → dist/
pnpm test:unit            # Jest unit tests (a fake SigNoz on node:http; no network)
pnpm test tests/unit/mcp/tools.test.ts   # One file
pnpm test:live            # Against a real instance, from .env.test (see env.example)
pnpm check:types          # tsc --noEmit over src, tests and scripts
pnpm check:lint           # oxlint
pnpm check:format         # oxfmt (120 columns)
pnpm check:knip           # Unused files, exports and dependencies
pnpm codegen              # spec → src/generated/ (never hand-edit)
pnpm codegen:mcp          # spec → src/mcp/generated/catalog.json (never hand-edit)
pnpm docs:dev             # Preview the docs site (append `--locale pt-BR`)
pnpm docs:build           # Build the docs site, every locale, into website/build/
pnpm docs:serve           # Serve website/build/ (where search works; it does not under docs:dev)
GIT_USER=<user> pnpm docs:deploy  # Build and push the site to the gh-pages branch (GitHub Pages)
```

No CI: husky runs lint and format on commit, types, knip and unit tests on push. Commits follow
Conventional Commits (commitlint). Every script must run on Windows too: no `rm`, `$VAR`, `VAR=1 cmd`.
After its checks, `pre-push` hands its refs to `scripts/deploy-site.mjs` (plane's): on a push of `main`
to `origin`'s URL that touches `website/` or `src/`, it starts itself detached, waits until `origin`'s
`main` is the pushed commit, checks it out in the worktree `<git dir>/site-deploy/tree` and runs
`pnpm docs:deploy` there, logging to `<git dir>/site-deploy/deploy.log`. `SIGNOZ_SKIP_SITE_DEPLOY=1`
skips it.

## Architecture

**SDK** (`src/`, ported from `../signoz-ts-bun-sdk`, translated to English).
`scripts/generate.ts` reads `spec/openapi.v<signozVersion>.yml` (`signozVersion` in `package.json`, apart
from the package's own semver `version`) and writes `src/generated/`:
`schema.ts` (openapi-typescript), `operations.ts` (operationId → method, path, response mode, auth)
and one service per tag. `createSignozClient` (`src/client.ts`) takes `{ apiKey }` (header
`SigNoz-Api-Key`, no rotation) or `{ authToken, refreshAuthToken }` (Bearer, a 401 rotates once
through `Session`, `src/auth/session.ts`). `Transport` (`src/transport.ts`) does the HTTP, the
timeout per attempt and the response modes; `redact` (`src/errors.ts`) masks secrets in every error.
`FileTokenStore` persists a rotated pair and writes through `renameWithRetry` (`src/fs-util.ts`).

**MCP server** (`src/mcp/`, the `@hoyasumii/signoz/mcp` subpath). `buildSignozMcpServer(client)`
(`build.ts`) registers the tools; `serveSignozMcpStdio` (`stdio.ts`) and `startSignozMcpServer`
(`server.ts`, stateless HTTP on 127.0.0.1, Host check, `/health`, token-guarded `POST /shutdown`)
serve it. `cli.ts` is the `signoz-mcp` bin — in stdio mode stdout is the protocol, log to stderr.
`config.ts` resolves settings flag > env > saved `.env` > default and builds the client
(`clientFor`, session pair persisted to `session.json` beside the `.env`).

- `tools/telemetry.ts`, `metrics.ts`, `alerts.ts`, `dashboards.ts`: curated tools. They speak v5
  query_range through `query/v5.ts` (builder specs, `formatRange` summaries) and windows through
  `query/time.ts`.
- `query/dashboard.ts` builds v2 (Perses) dashboards: presets (`api_red`, `worker_failures`,
  `logs_errors`), one query per panel (a composite for several queries/formulas), a 12-column grid.
  `tests/unit/mcp/dashboard.test.ts` re-checks SigNoz v0.142.1's write rules
  (`pkg/types/dashboardtypes`) on every preset; keep it in step if SigNoz changes them.
  `signoz_create_dashboard` runs every panel's query first and saves nothing if one fails.
- `tools/generic.ts`: `signoz_resources`/`signoz_describe`/`signoz_call` over
  `generated/catalog.json`, built by `scripts/build-mcp-catalog.ts` (session lifecycle, SSO
  callbacks and the raw export are left out). `invoke.ts` refuses unknown parameters and
  destructive operations without `confirm: true`. `tests/unit/mcp/catalog.test.ts` fails when the
  catalog is stale.

**CLI** (`src/cli/`, the `signoz` bin, citty 0.1.x). `connect.ts` connects over HTTP with `--url`
or in-process through `InMemoryTransport`; `run.ts` turns each tool into a subcommand
(`schema-args.ts` maps JSON Schema to flags). `signoz mcp …` (`src/cli/mcp/`) is plane's code:
`config` (prompt, flags or `--web` form; `config-ui.ts` holds the rules — a blank secret keeps the
saved one, `-` clears it), `start`/`stop`/`status` (`daemon.ts`), `boot` (`boot.ts`), `install`/
`uninstall` (`install.ts`, `hosts.ts` with the WSL→Windows bridge). Every OS call goes through
`McpDeps` (`deps.ts`, on `cross-spawn`). `requireSavedConfig` refuses every command but
`mcp config`, `mcp uninstall` and help until a URL and a credential are saved.

`boot.ts`, `daemon.ts`, `deps.ts`, `hosts.ts`, `index.ts`, `install.ts` and `picker.ts` track plane's
versions: re-derive them from `../plane/src/cli/mcp/` by renaming and re-applying the SigNoz edits
rather than diverging by hand.

**Docs site** (`website/`, a pnpm workspace package, plane's site with SigNoz's orange as the accent):
Docusaurus, published to GitHub Pages at `https://hoyasumii.github.io/signoz/` (the package's
`homepage`, which `signoz docs` prints and opens) by `pnpm docs:deploy`. The guides are plain Markdown
(`markdown.format: "md"`) in `website/docs/`, mirrored page for page in
`website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`; change both together
(`tests/unit/website.test.ts` checks the mirror and that `website/i18n/` matches `i18n.locales`).
`website/docs/api/` is generated from `src/index.ts` and `src/mcp/index.ts` by
docusaurus-plugin-typedoc on the `en` build only, and gitignored; the pt-BR site links to it through
relative `pathname://` links. `llms.txt` and `llms-full.txt` are generated into the build root from the
English guides by docusaurus-plugin-llms (its `gray-matter` needs the `gray-matter>js-yaml` override in
`pnpm-workspace.yaml`); never hand-write them. Search is `@easyops-cn/docusaurus-search-local`, built by
`docs:build` only. `website/scripts/build.mjs` builds one locale per process, `en` first.

## Conventions

- Code, comments and messages in English, the ported SDK included.
- Avoid `any`; tool inputs are zod schemas, SigNoz shapes come from `components["schemas"]`.
- Never log a credential; tool errors go through `describeError` (`src/mcp/errors.ts`).
