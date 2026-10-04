---
sidebar_position: 100
title: Contribution
description: "Configurer le dépôt, exécuter les vérifications et les tests, suivre un nouveau SigNoz et de construire ce site de documentation."
---

# Contribution

Le dépôt est [Hoyasumii/signoz](https://github.com/Hoyasumii/signoz), géré avec pnpm (Node.js 20 ou plus).

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

Chaque script est multiplateforme : non `rm`, `$VAR` ou `VAR=1 cmd`. `.gitattributes` garde LF, avec `.cmd`/`.vbs` en
CRLF.

Les chèques passent localement par les crochets git. `pre-commit` pistes `check:lint` et `check:format`, `commit-msg`
exécute commitlint avec la configuration conventionnelle (`feat: …`, `fix(mcp): …`), et `pre-push` pistes `check:types`,
`check:knip` et `test:unit`.

Chaque poussée vers `main` exécute le workflow de livraison continue (`.github/workflows/cd.yml`) . Il exécute les mêmes
vérifications et la construction, puis:

- publie `package.json`version à npm lorsque cette version n'est pas encore dans le registre (par Trusted Publishing,
  avec provenance), l'étiquette `v<version>` et ouvre une GitHub libération;
- construit le site et le déploie `gh-pages` branche quand la poussée touche `website/` ou `src/` (une opération
  manuelle du workflow le déploie toujours).

Pour libérer, bosse `version` en `package.json` et fusionner à `main`.

## Code produit

```bash
pnpm codegen          # spec/openapi.v<version>.yml → src/generated/ (never edit by hand)
pnpm codegen:mcp      # spec → src/mcp/generated/catalog.json (a unit test fails when it is stale)
```

Pour suivre un nouveau SigNoz version:

1. Télécharger le tag `docs/api/openapi.yml` dans `spec/`.
2. Changement `signozVersion` en `package.json`, bosse `version` et ajouter une ligne à la table de compatibilité.
3. Cours `pnpm codegen && pnpm codegen:mcp`.

## Ce site

Le site est un Docusaurus paquet espace de travail dans `website/`, en anglais et portugais (Brésil).

```bash
pnpm docs:dev                    # preview (append `--locale pt-BR` for the translation)
pnpm docs:build                  # build every locale into website/build/
pnpm docs:serve                  # serve the build (search only works on a build)
GIT_USER=<user> pnpm docs:deploy # build and push to the gh-pages branch
```

- Les guides sont simples Markdown in `website/docs/`, page miroir pour la page dans
  `website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`: changer les deux ensemble.
- Les [Référence API](pathname://../docs/api) est généré à partir de `src/index.ts` et `src/mcp/index.ts` par TypeDoc
  sur chaque construction anglaise.
- `llms.txt` et `llms-full.txt` sont générés à la racine du site à partir des guides anglais sur chaque construction.
