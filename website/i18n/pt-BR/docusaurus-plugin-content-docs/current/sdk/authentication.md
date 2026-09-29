---
sidebar_position: 2
title: Autenticação
description: "Uma API key de service account, ou os tokens da sessão do navegador com rotação automática e um arquivo de tokens."
---

# Autenticação

O cliente recebe **ou** uma API key **ou** o par de tokens da sessão do navegador. Passar os dois é um
`SignozConfigError`.

## API key (recomendado)

No SigNoz, abra **Settings → Service Accounts**, crie uma conta com o papel de que precisa e gere uma chave.

```ts
const signoz = createSignozClient({ baseUrl, apiKey: process.env.SIGNOZ_API_KEY! });
```

A chave vai no header `SigNoz-Api-Key` (exportado como `API_KEY_HEADER`). Ela não expira com uma sessão e não
disputa uma com o seu navegador.

## Sessão do navegador

Com o SigNoz aberto e logado, abra o DevTools → **Application → Local Storage** → a URL do SigNoz e copie
`AUTH_TOKEN` e `REFRESH_AUTH_TOKEN`.

```ts
import { createSignozClient, FileTokenStore } from "@hoyasumii/signoz";

const signoz = createSignozClient({
  baseUrl,
  authToken: process.env.SIGNOZ_AUTH_TOKEN!,
  refreshAuthToken: process.env.SIGNOZ_REFRESH_AUTH_TOKEN!,
  tokenStore: new FileTokenStore(".signoz-session.json"),
});
```

- Toda chamada envia `Authorization: Bearer <authToken>`.
- Um 401 dispara `POST /api/v2/sessions/rotate` e a chamada é repetida uma vez. A rotação é única: chamadas
  simultâneas que recebem 401 compartilham uma só rotação.
- Uma rotação recusada lança `SignozSessionExpiredError`: copie tokens novos do navegador.
- A sessão expira após 7 dias ociosa ou 30 dias no total.
- Com o tokenizer `opaque`, o SDK e o navegador disputam a mesma sessão. Prefira a API key, ou faça login só para
  isso numa janela anônima.

### Guardando o par rotacionado

Um par rotacionado vive só em memória, a menos que você o guarde:

- `onTokensRotated(tokens)` é chamado a cada rotação, para você persistir o par.
- `tokenStore` o persiste por você. `FileTokenStore` grava um JSON com modo 0600 (no Windows a ACL da pasta o
  protege), por um rename que tenta de novo enquanto outro processo segura o arquivo.

O store lembra de qual par o salvo descende (`tokenPairHash`). No próximo início, o par salvo vence enquanto o par
informado não mudou, por ser mais novo; quando você cola um par novo, o novo vence.

`createSignozClientFromEnv()` faz isso sozinho: guarda o par em `SIGNOZ_TOKEN_FILE` ou `.signoz-session.json`
(`tokenFile: false` desliga).

`signoz.auth` diz qual modo o cliente usa (`"api_key"` ou `"session"`), e `signoz.tokens` dá o par atual.
