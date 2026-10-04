---
sidebar_position: 100
title: Contribuir
description: "Configurar o repositório, executar as verificações e os testes, seguir um novo SigNoz versão, e construir este site de documentação."
---

# Contribuir

O repositório é [Hoyasumii](https://github.com/Hoyasumii/signoz), gerido com pnpm (Node.js 20 ou mais tarde).

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

Cada script é multiplataforma: não `rm`, `$VAR` ou `VAR=1 cmd`. `.gitattributes` mantém LF, com `.cmd`/`.vbs` em CRLF.

As verificações correm localmente através de ganchos git. `pre-commit` executa `check:lint` e `check:format`,
`commit-msg` executa commitlint com a configuração convencional (`feat: …`, `fix(mcp): …`), e `pre-push` executa
`check:types`, `check:knip` e `test:unit`.

Cada empurrão para `main` executa o fluxo de trabalho de entrega contínua (`.github/workflows/cd.yml`). Faz as mesmas
verificações e a construção, então:

- publica `package.json`a versão para npm quando essa versão ainda não está no registro (através da publicação
  confiável, com procedência), etiqueta-a `v<version>` e abre uma GitHub libertação;
- constrói o site e implantá-lo para o `gh-pages` branch quando o push toca `website/` ou `src/` (uma execução manual do
  fluxo de trabalho sempre o implementa).

Para libertar, bater `version` em `package.json` e mesclar para `main`.

## Código gerado

```bash
pnpm codegen          # spec/openapi.v<version>.yml → src/generated/ (never edit by hand)
pnpm codegen:mcp      # spec → src/mcp/generated/catalog.json (a unit test fails when it is stale)
```

Para seguir um novo SigNoz versão:

1. Baixar as tags `docs/api/openapi.yml` em `spec/`.
2. Alterar `signozVersion` em `package.json`, bater `version` e adicione uma linha à tabela de compatibilidade.
3. Executar `pnpm codegen && pnpm codegen:mcp`.

## Este site

O site é um Docusaurus pacote de espaço de trabalho em `website/`, em inglês e português (Brasil).

```bash
pnpm docs:dev                    # preview (append `--locale pt-BR` for the translation)
pnpm docs:build                  # build every locale into website/build/
pnpm docs:serve                  # serve the build (search only works on a build)
GIT_USER=<user> pnpm docs:deploy # build and push to the gh-pages branch
```

- Os guias são simples Markdown em `website/docs/`, página espelhada para página em
  `website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`: mudar ambos juntos.
- A [Referência da API](pathname://../docs/api) é gerado a partir de `src/index.ts` e `src/mcp/index.ts` por TypeDoc em
  cada compilação inglesa.
- `llms.txt` e `llms-full.txt` são gerados na raiz do local a partir dos guias ingleses em cada construção.
