---
sidebar_position: 100
title: Beitrag
description: "Richten Sie das Repository ein, führen Sie die Prüfungen und Tests aus, folgen Sie einem neuen SigNoz Version, und bauen Sie diese Dokumentationsseite."
---

# Beitrag

Das Repository ist [Hoyasumii/signoz](https://github.com/Hoyasumii/signoz), verwaltet mit pnpm ()Node.js 20 oder später.

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

Jedes Skript ist plattformübergreifend: nein `rm`, `$VAR` oder `VAR=1 cmd`. `.gitattributes` hält LF, mit `.cmd`/`.vbs`
in CRLF.

Die Kontrollen laufen lokal über Git-Hooks. `pre-commit` Läufe `check:lint` und `check:format`, `commit-msg` läuft
commitlint mit der konventionellen config ()`feat: …`, `fix(mcp): …`, und `pre-push` Läufe `check:types`, `check:knip`
und `test:unit`.

Jeder Push auf `main` führt den Continuous Delivery Workflow aus ()`.github/workflows/cd.yml`. Es läuft die gleichen
Prüfungen und der Build, dann:

- veröffentlicht `package.json`Version von npm wenn diese Version noch nicht in der Registry ist (über Trusted
  Publishing, mit Provenienz), taggt sie `v<version>` und öffnet eine GitHub Freigabe;
- Erstellt die Website und setzt sie auf die `gh-pages` Verzweigung, wenn der Push berührt `website/` oder `src/` (Ein
  manueller Ablauf des Workflows stellt ihn immer bereit).

Lösen, Beule `version` in `package.json` und verschmelzen mit `main`.

## Generierter Code

```bash
pnpm codegen          # spec/openapi.v<version>.yml → src/generated/ (never edit by hand)
pnpm codegen:mcp      # spec → src/mcp/generated/catalog.json (a unit test fails when it is stale)
```

Um einem neuen zu folgen SigNoz Version:

1. Download des Tags `docs/api/openapi.yml` in `spec/`.
2. Änderung `signozVersion` in `package.json`, Beule `version` und fügen Sie eine Zeile zur Kompatibilitätstabelle
   hinzu.
3. Lauf `pnpm codegen && pnpm codegen:mcp`.

## Diese Website

Die Website ist eine Docusaurus Workspace Paket in `website/`, in englischer und portugiesischer Sprache (Brasilien).

```bash
pnpm docs:dev                    # preview (append `--locale pt-BR` for the translation)
pnpm docs:build                  # build every locale into website/build/
pnpm docs:serve                  # serve the build (search only works on a build)
GIT_USER=<user> pnpm docs:deploy # build and push to the gh-pages branch
```

- Die Guides sind schlicht Markdown in `website/docs/`Seite für Seite in
  `website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`Ändern Sie beide zusammen.
- Die [API-Referenz](pathname://../docs/api) erzeugt wird aus `src/index.ts` und `src/mcp/index.ts` von TypeDoc auf
  jedem englischen Build.
- `llms.txt` und `llms-full.txt` werden an der Wurzel der Website von den englischen Guides bei jedem Build generiert.
