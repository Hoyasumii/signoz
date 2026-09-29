---
sidebar_position: 6
title: Generic tools
description: "signoz_resources, signoz_describe and signoz_call: every other operation of the SigNoz REST API."
---

# Generic tools

The curated tools cover telemetry, alerts and dashboards. For everything else (saved views, notification channels,
downtimes, service accounts, users, …) three tools reach the other ~230 operations of the REST API.

1. **`signoz_resources`** lists the services and their operations. With a `query` (e.g. `saved view`,
   `downtime`, `notification channel`), only the matching ones.
2. **`signoz_describe`** gives one operation's full signature: path and query parameters, the body schema, the
   permission it needs and an example `signoz_call` input. With `schema`, it expands one schema from the spec
   (`depth` levels deep, default 3).
3. **`signoz_call`** runs it: `operation` is `service.method` (`savedView.createSavedView`) or the `operationId`
   (`CreateSavedView`), and `args` holds `path`, `query` and `body`.

```json
{ "operation": "rules.listRules", "args": {} }
```

## Safety

- Unknown parameters are refused, so a typo does not silently drop a filter.
- Destructive operations (delete, revoke, disconnect, unlock) need `confirm: true`. The agent is told to ask you
  first.
- Session lifecycle operations, SSO callbacks and the raw export are left out of the catalog.
- A long answer is cut at 60,000 characters, saying so.

The catalog is generated from the same OpenAPI spec as the SDK (`pnpm codegen:mcp`).
