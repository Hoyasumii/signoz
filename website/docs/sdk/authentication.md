---
sidebar_position: 2
title: Authentication
description: "A service account API key, or the browser session's tokens with automatic rotation and a token file."
---

# Authentication

The client takes **either** an API key **or** the browser session's token pair. Passing both is a
`SignozConfigError`.

## API key (recommended)

In SigNoz, open **Settings → Service Accounts**, create an account with the role you need and generate a key.

```ts
const signoz = createSignozClient({ baseUrl, apiKey: process.env.SIGNOZ_API_KEY! });
```

The key goes in the `SigNoz-Api-Key` header (exported as `API_KEY_HEADER`). It does not expire with a session and
does not compete with your browser for one.

## Browser session

With SigNoz open and logged in, open DevTools → **Application → Local Storage** → the SigNoz URL and copy
`AUTH_TOKEN` and `REFRESH_AUTH_TOKEN`.

```ts
import { createSignozClient, FileTokenStore } from "@hoyasumii/signoz";

const signoz = createSignozClient({
  baseUrl,
  authToken: process.env.SIGNOZ_AUTH_TOKEN!,
  refreshAuthToken: process.env.SIGNOZ_REFRESH_AUTH_TOKEN!,
  tokenStore: new FileTokenStore(".signoz-session.json"),
});
```

- Every call sends `Authorization: Bearer <authToken>`.
- A 401 triggers `POST /api/v2/sessions/rotate` and the call is retried once. The rotate is single-flight:
  concurrent calls that get a 401 share one rotate.
- A refused rotate throws `SignozSessionExpiredError`: copy fresh tokens from the browser.
- The session expires after 7 idle days or 30 days in total.
- With the `opaque` tokenizer, the SDK and the browser compete for the same session. Prefer the API key, or log
  in just for this in a private window.

### Keeping the rotated pair

A rotated pair lives in memory unless you keep it:

- `onTokensRotated(tokens)` is called on every rotate, to persist the pair yourself.
- `tokenStore` persists it for you. `FileTokenStore` writes a JSON file with mode 0600 (on Windows the folder's
  ACL protects it), through a rename that retries while another process holds the file.

The store remembers which pair the saved one descends from (`tokenPairHash`). On the next start, the saved pair
wins while the given pair is unchanged, since it is newer; once you paste a new pair, the new pair wins.

`createSignozClientFromEnv()` sets this up on its own: it keeps the pair in `SIGNOZ_TOKEN_FILE` or
`.signoz-session.json` (`tokenFile: false` turns that off).

`signoz.auth` says which mode the client uses (`"api_key"` or `"session"`), and `signoz.tokens` gives the current
pair.
