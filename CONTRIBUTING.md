# Contributing

Thanks for helping. The full guide — building from source, the tests, following a new SigNoz version, and the
docs site — is at <https://hoyasumii.github.io/signoz/docs/contributing>. The short version:

- You need Node.js 20 or later and pnpm. Run `pnpm install` first: it also installs the git hooks. `pre-commit` runs
  `check:lint` and `check:format`, and `pre-push` runs `check:types`, `check:knip` and `test:unit`.
- Every push to `main` runs the Continuous Delivery workflow (`.github/workflows/cd.yml`): the same checks and the
  build, then it publishes `package.json`'s version to npm when that version is not there yet, and deploys the docs
  site when the push touches `website/` or `src/`. To release, bump `version` in `package.json` and merge to `main`.
- Commit messages follow Conventional Commits (`feat: …`, `fix(mcp): …`), enforced by commitlint.
- Every script must run on Windows too: no `rm`, `$VAR` or `VAR=1 cmd`.
- `src/generated/` and `src/mcp/generated/catalog.json` come from the spec through `pnpm codegen` and
  `pnpm codegen:mcp`: never edit them by hand.
- A docs change goes in both languages: `website/docs/` and its mirror under
  `website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`.
- Never log a credential; tool errors go through `describeError` (`src/mcp/errors.ts`).

Report security problems privately, as [SECURITY.md](SECURITY.md) describes, and not in a public issue.
Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
