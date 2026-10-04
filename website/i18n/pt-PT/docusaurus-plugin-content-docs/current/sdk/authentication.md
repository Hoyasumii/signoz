---
sidebar_position: 2
title: autenticação
description: "Uma chave API de conta de serviço, ou tokens da sessão do navegador com rotação automática e um arquivo de token."
---

# autenticação

O cliente leva **quer** uma chave de API **ou** O par de fichas da sessão do navegador. Passar ambos é um
`SignozConfigError`.

## Chave API (recomendada)

In SigNoz, abrir **Configurações → Contas de serviço**, criar uma conta com o papel que você precisa e gerar uma chave.

```ts
const signoz = createSignozClient({ baseUrl, apiKey: process.env.SIGNOZ_API_KEY! });
```

A chave vai no `SigNoz-Api-Key` cabeçalho (exportado como `API_KEY_HEADER`). Ele não expira com uma sessão e não compete
com seu navegador para um.

## Sessão do navegador

Com SigNoz abrir e logado, abrir DevTools → **Aplicação → Armazenamento Local** → o SigNoz URL e cópia `AUTH_TOKEN` e
`REFRESH_AUTH_TOKEN`.

```ts
import { createSignozClient, FileTokenStore } from "@hoyasumii/signoz";

const signoz = createSignozClient({
  baseUrl,
  authToken: process.env.SIGNOZ_AUTH_TOKEN!,
  refreshAuthToken: process.env.SIGNOZ_REFRESH_AUTH_TOKEN!,
  tokenStore: new FileTokenStore(".signoz-session.json"),
});
```

- Cada chamada envia `Authorization: Bearer <authToken>`.
- A 401 gatilhos `POST /api/v2/sessions/rotate` E a chamada é repetida uma vez. A rotação é de um único voo: chamadas
  simultâneas que recebem um 401 compartilhar um giro.
- Uma rotação recusada lança `SignozSessionExpiredError`: copiar fichas frescas do navegador.
- A sessão expira após 7 dias ociosos ou 30 dias no total.
- Com o `opaque` tokenizer, o SDK e o navegador competem para a mesma sessão. Prefere a chave API, ou faça logon apenas
  para isso em uma janela privada.

### Manter o par girado

Um par girado vive em memória a menos que você guarde:

- `onTokensRotated(tokens)` é chamado em cada rotação, para persistir o par você mesmo.
- `tokenStore` persiste para ti. `FileTokenStore` escreve um arquivo JSON com o modo 0600 (no Windows o ACL da pasta o
  protege), através de um renome que retorna enquanto outro processo mantém o arquivo.

A loja se lembra de qual par o salvo desce (`tokenPairHash`). No próximo início, o par salvo ganha enquanto o par dado
está inalterado, uma vez que é mais novo; uma vez que você colar um novo par, o novo par ganha.

`createSignozClientFromEnv()` configura isto por si só: mantém o par dentro `SIGNOZ_TOKEN_FILE` ou
`.signoz-session.json` (`tokenFile: false` Desliga isso).

`signoz.auth` diz qual o modo que o cliente usa (`"api_key"` ou `"session"`), e `signoz.tokens` dá o par atual.
