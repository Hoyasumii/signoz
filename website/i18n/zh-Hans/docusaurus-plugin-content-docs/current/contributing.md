---
sidebar_position: 100
title: 捐款
description: "建立仓库 检查和测试 SigNoz ,并构建此文档网站。"
---

# 捐款

仓库是 [胡亚苏米/锡诺兹](https://github.com/Hoyasumii/signoz),管理与 pnpm (单位:千美元)Node.js (第20条或以后)。

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

每个脚本都是跨平台的:没有 `rm`, (中文). `$VAR` 或 `VAR=1 cmd`。 。 。 。 `.gitattributes` 保持 LF, 与 `.cmd`页:1`.vbs` 在 CRLF 中。

支票通过钩子在当地运行。 `pre-commit` 运行 `check:lint` 和 `check:format`, (中文). `commit-msg` 使用常规配置运行承诺( R)`feat: …`, (中文).
`fix(mcp): …`),以及 `pre-push` 运行 `check:types`, (中文). `check:knip` 和 `test:unit`。 。 。 。

每一次推进 `main` 运行连续交付工作流程`.github/workflows/cd.yml`) (中文(简体) ). 它运行相同的检查和建筑,然后:

- 发表 `package.json`'版本为 npm 当该版本尚未登入登记册时(通过信任出版,有来源),标记它 `v<version>` 打开一个 GitHub 释放;
- 建立网站并将其部署到 `gh-pages` 当推力触动时,树枝 `website/` 或 `src/` (工作流程的人工运行总是部署).

要释放,碰碰 `version` 输入 `package.json` 合并到 `main`。 。 。 。

## 生成代码

```bash
pnpm codegen          # spec/openapi.v<version>.yml → src/generated/ (never edit by hand)
pnpm codegen:mcp      # spec → src/mcp/generated/catalog.json (a unit test fails when it is stale)
```

跟着新的 SigNoz 版本 :

1. 下载标签 `docs/api/openapi.yml` 输入 `spec/`。 。 。 。
2. 变动 `signozVersion` 输入 `package.json`颠倒 `version` ,并在兼容表中添加一行。
3. 运行 `pnpm codegen && pnpm codegen:mcp`。 。 。 。

## 这个网站

网站是一个 Docusaurus 工作空间软件包 `website/`,英文和葡萄牙文(巴西)。

```bash
pnpm docs:dev                    # preview (append `--locale pt-BR` for the translation)
pnpm docs:build                  # build every locale into website/build/
pnpm docs:serve                  # serve the build (search only works on a build)
GIT_USER=<user> pnpm docs:deploy # build and push to the gh-pages branch
```

- 向导是简单的Markdown在 `website/docs/`中,页面的镜像页 `website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`:同时改变两个.
- 那个 [API 参考](pathname://../docs/api) 生成自 `src/index.ts` 和 `src/mcp/index.ts` 由TypeDoc在每栋英式建筑。
- `llms.txt` 和 `llms-full.txt` 由每个建筑的英文指南 产生
