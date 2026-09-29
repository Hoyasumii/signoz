---
sidebar_position: 100
title: Contributing
description: "Set up the repository, run the checks and the tests, follow a new SigNoz version, and build this documentation site."
---

# Contributing

The repository is [Hoyasumii/signoz](https://github.com/Hoyasumii/signoz), managed with pnpm (Node.js 20 or later).

```bash
pnpm install          # dependencies, plus the git hooks (husky)
pnpm build            # tsc → dist/ (CommonJS + .d.ts)
pnpm test:unit        # jest, with a fake SigNoz on node:http (no network)
pnpm test:live        # against a real instance (.env.test, from env.example)
pnpm check:types      # tsc --noEmit over src, tests and scripts
pnpm check:lint       # oxlint (`pnpm fix:lint` fixes what it can)
pnpm check:format     # oxfmt, 120 columns (`pnpm fix:format` rewrites)
pnpm check:knip       # unused files, exports and dependencies
```

Every script is cross-platform: no `rm`, `$VAR` or `VAR=1 cmd`. `.gitattributes` keeps LF, with `.cmd`/`.vbs` in
CRLF.

There is no CI: the checks run locally through git hooks. `pre-commit` runs `check:lint` and `check:format`,
`commit-msg` runs commitlint with the conventional config (`feat: …`, `fix(mcp): …`), and `pre-push` runs
`check:types`, `check:knip` and `test:unit`.

After a push of `main` to `origin` that touches `website/` or `src/`, `pre-push` also starts
`scripts/deploy-site.mjs` in the background. It waits for the push to land, checks the pushed commit out in a
worktree of its own and runs `pnpm docs:deploy` there, so the site follows `main` without holding up the push. Its
log is `site-deploy/deploy.log` under the git directory; `SIGNOZ_SKIP_SITE_DEPLOY=1` skips it for one push.

## Generated code

```bash
pnpm codegen          # spec/openapi.v<version>.yml → src/generated/ (never edit by hand)
pnpm codegen:mcp      # spec → src/mcp/generated/catalog.json (a unit test fails when it is stale)
```

To follow a new SigNoz version:

1. Download the tag's `docs/api/openapi.yml` into `spec/`.
2. Change `signozVersion` in `package.json`, bump `version` and add a row to the compatibility table.
3. Run `pnpm codegen && pnpm codegen:mcp`.

## This site

The site is a Docusaurus workspace package in `website/`, in English and Portuguese (Brazil).

```bash
pnpm docs:dev                    # preview (append `--locale pt-BR` for the translation)
pnpm docs:build                  # build every locale into website/build/
pnpm docs:serve                  # serve the build (search only works on a build)
GIT_USER=<user> pnpm docs:deploy # build and push to the gh-pages branch
```

- The guides are plain Markdown in `website/docs/`, mirrored page for page in
  `website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`: change both together.
- The [API reference](pathname://../docs/api) is generated from `src/index.ts` and `src/mcp/index.ts` by TypeDoc
  on every English build.
- `llms.txt` and `llms-full.txt` are generated at the site's root from the English guides on every build.
