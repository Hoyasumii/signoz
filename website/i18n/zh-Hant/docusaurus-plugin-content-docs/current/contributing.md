---
sidebar_position: 100
title: 捐款
description: "建立主目錄, 執行檢查和測試, 跟著新的 SigNoz 版本,並建立此文件網站。"
---

# 捐款

主目錄是 [Hoyasumii/ signoz](https://github.com/Hoyasumii/signoz)管理 pnpm (Node.js )

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

每個文稿都是跨平台的: 不 `rm`, `$VAR` 或 `VAR=1 cmd`. `.gitattributes` 保持 LF,与 `.cmd`/`.vbs` 在CRLF。

支票是當地的通訊 `pre-commit` 執行 `check:lint` 和 `check:format`, `commit-msg` 使用傳統設定值執行輸入( R)`feat: …`, `fix(mcp): …`),和
`pre-push` 執行 `check:types`, `check:knip` 和 `test:unit`.

每次推到 `main` 執行連續交付工作流程( E)`.github/workflows/cd.yml`). 它做同樣的支票和建築 然後:

- 出版 `package.json`版本到 npm 當版本尚未登入登記錄時( 通过信任的出版, 有來源) , 標籤它 `v<version>` 開啟 GitHub 释放;
- 建立網站并将其部署到 `gh-pages` 推動觸碰時的分枝 `website/` 或 `src/` (工作流程的人工操作總是部署).

要釋放,碰碰 `version` in `package.json` 合并到 `main`.

## 產生的代碼

```bash
pnpm codegen          # spec/openapi.v<version>.yml → src/generated/ (never edit by hand)
pnpm codegen:mcp      # spec → src/mcp/generated/catalog.json (a unit test fails when it is stale)
```

跟隨新的 SigNoz 版本 :

1. 下載此標籤 `docs/api/openapi.yml` 成 `spec/`.
2. 更改 `signozVersion` in `package.json`碰撞 `version` 并加入一行到相容表。
3. 快跑 `pnpm codegen && pnpm codegen:mcp`.

## 這個網站

這個網站是 Docusaurus 工作空間套件 `website/`,英文和葡萄牙文(巴西)。

```bash
pnpm docs:dev                    # preview (append `--locale pt-BR` for the translation)
pnpm docs:build                  # build every locale into website/build/
pnpm docs:serve                  # serve the build (search only works on a build)
GIT_USER=<user> pnpm docs:deploy # build and push to the gh-pages branch
```

- 指導者是普通的馬克頓 `website/docs/`中的頁面 `website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`:一起改變。
- 其 [API 參考](pathname://../docs/api) 產生自 `src/index.ts` 和 `src/mcp/index.ts` 由TypeDoc在每座英式建筑。
- `llms.txt` 和 `llms-full.txt` 根據每座建築的英文導覽,
