---
sidebar_position: 100
title: Contribuindo
description: "Prepare o repositório, rode as verificações e os testes, acompanhe uma nova versão do SigNoz e construa este site de documentação."
---

# Contribuindo

O repositório é [Hoyasumii/signoz](https://github.com/Hoyasumii/signoz), gerenciado com pnpm (Node.js 20 ou mais
recente).

```bash
pnpm install          # dependências, mais os git hooks (husky)
pnpm build            # tsc → dist/ (CommonJS + .d.ts)
pnpm test:unit        # jest, com um SigNoz falso em node:http (sem rede)
pnpm test:live        # contra uma instância real (.env.test, a partir de env.example)
pnpm check:types      # tsc --noEmit sobre src, tests e scripts
pnpm check:lint       # oxlint (`pnpm fix:lint` corrige o que der)
pnpm check:format     # oxfmt, 120 colunas (`pnpm fix:format` reescreve)
pnpm check:knip       # arquivos, exports e dependências não usados
```

Todo script é multiplataforma: nada de `rm`, `$VAR` ou `VAR=1 cmd`. O `.gitattributes` mantém LF, com `.cmd`/`.vbs`
em CRLF.

Não há CI: as verificações rodam localmente por git hooks. `pre-commit` roda `check:lint` e `check:format`,
`commit-msg` roda o commitlint com a config convencional (`feat: …`, `fix(mcp): …`), e `pre-push` roda
`check:types`, `check:knip` e `test:unit`.

Depois de um push da `main` para o `origin` que toque em `website/` ou `src/`, o `pre-push` também inicia
`scripts/deploy-site.mjs` em segundo plano. Ele espera o push chegar, faz checkout do commit enviado numa worktree
própria e roda `pnpm docs:deploy` lá, para o site acompanhar a `main` sem segurar o push. O log fica em
`site-deploy/deploy.log` dentro do diretório do git; `SIGNOZ_SKIP_SITE_DEPLOY=1` o pula num push.

## Código gerado

```bash
pnpm codegen          # spec/openapi.v<versão>.yml → src/generated/ (nunca edite à mão)
pnpm codegen:mcp      # spec → src/mcp/generated/catalog.json (um teste unitário falha quando está desatualizado)
```

Para acompanhar uma nova versão do SigNoz:

1. Baixe o `docs/api/openapi.yml` da tag para `spec/`.
2. Mude `signozVersion` no `package.json`, suba a `version` e acrescente uma linha na tabela de compatibilidade.
3. Rode `pnpm codegen && pnpm codegen:mcp`.

## Este site

O site é um pacote de workspace Docusaurus em `website/`, em inglês e português (Brasil).

```bash
pnpm docs:dev                    # pré-visualização (acrescente `--locale pt-BR` para a tradução)
pnpm docs:build                  # constrói todos os idiomas em website/build/
pnpm docs:serve                  # serve o build (a busca só funciona num build)
GIT_USER=<usuário> pnpm docs:deploy # constrói e envia para a branch gh-pages
```

- Os guias são Markdown puro em `website/docs/`, espelhados página a página em
  `website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`: mude os dois juntos.
- A [referência da API](pathname://../../docs/api) é gerada de `src/index.ts` e `src/mcp/index.ts` pelo TypeDoc a
  cada build em inglês.
- `llms.txt` e `llms-full.txt` são gerados na raiz do site a partir dos guias em inglês a cada build.
