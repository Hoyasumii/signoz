---
sidebar_position: 100
title: Contribución
description: "Configurar el repositorio, ejecutar los cheques y las pruebas, seguir un nuevo SigNoz versión, y construir este sitio de documentación."
---

# Contribución

El repositorio es [Hoyasumii/signoz](https://github.com/Hoyasumii/signoz), manejado con pnpm (G)Node.js 20 o más tarde).

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

Cada script es multiplataforma: no `rm`, `$VAR` o `VAR=1 cmd`. `.gitattributes` mantiene LF, con `.cmd`/`.vbs` en CRLF.

Los cheques funcionan localmente a través de ganchos de git. `pre-commit` carreras `check:lint` y `check:format`,
`commit-msg` ejecuta compromiso con el config convencional (`feat: …`, `fix(mcp): …`), y `pre-push` carreras
`check:types`, `check:knip` y `test:unit`.

Cada empujón `main` ejecuta el flujo de trabajo de entrega continua (`.github/workflows/cd.yml`). Corre los mismos
cheques y la construcción, entonces:

- publica `package.json`'s versión a npm cuando esa versión aún no está en el registro (a través de Trusted Publishing,
  con procedencia), lo etiqueta `v<version>` y abre una GitHub liberación;
- construye el sitio y lo implementa al `gh-pages` rama cuando el empuje toca `website/` o `src/` (una ejecución manual
  del flujo de trabajo siempre lo despliega).

Para soltar, golpe `version` dentro `package.json` y fusionarse `main`.

## Código generado

```bash
pnpm codegen          # spec/openapi.v<version>.yml → src/generated/ (never edit by hand)
pnpm codegen:mcp      # spec → src/mcp/generated/catalog.json (a unit test fails when it is stale)
```

Para seguir un nuevo SigNoz versión:

1. Descargar la etiqueta `docs/api/openapi.yml` en `spec/`.
2. Cambio `signozVersion` dentro `package.json`, golpe `version` y añadir una fila a la tabla de compatibilidad.
3. Corre `pnpm codegen && pnpm codegen:mcp`.

## Este sitio

El sitio es un Docusaurus paquete de espacio de trabajo en `website/`, en inglés y portugués (Brasil).

```bash
pnpm docs:dev                    # preview (append `--locale pt-BR` for the translation)
pnpm docs:build                  # build every locale into website/build/
pnpm docs:serve                  # serve the build (search only works on a build)
GIT_USER=<user> pnpm docs:deploy # build and push to the gh-pages branch
```

- Los guías son simples Markdown en `website/docs/`, página espejo para página en
  `website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`- cambiar ambos juntos.
- El [Referencia de API](pathname://../docs/api) se genera desde `src/index.ts` y `src/mcp/index.ts` por TypeDoc en cada
  compilación inglesa.
- `llms.txt` y `llms-full.txt` se generan en la raíz del sitio de las guías inglesas en cada construcción.
