---
sidebar_position: 2
title: Authentification
description: "Une clé API de compte de service, ou les jetons de session du navigateur avec rotation automatique et un fichier de jeton."
---

# Authentification

Le client prend **soit** une clé API **ou** la paire de jetons de la session du navigateur. Passer les deux est un
`SignozConfigError`.

## Clé API (recommandée)

En SigNoz, ouvert **Paramètres → Comptes de service**, créer un compte avec le rôle dont vous avez besoin et générer une
clé.

```ts
const signoz = createSignozClient({ baseUrl, apiKey: process.env.SIGNOZ_API_KEY! });
```

La clé va dans le `SigNoz-Api-Key` en-tête (exporté comme `API_KEY_HEADER`) . Il n'expire pas avec une session et ne
concurrence pas votre navigateur pour une.

## Session du navigateur

Avec SigNoz ouvert et connecté, ouvrez DevTools → **Application → Stockage local** → les SigNoz URL et copie
`AUTH_TOKEN` et `REFRESH_AUTH_TOKEN`.

```ts
import { createSignozClient, FileTokenStore } from "@hoyasumii/signoz";

const signoz = createSignozClient({
  baseUrl,
  authToken: process.env.SIGNOZ_AUTH_TOKEN!,
  refreshAuthToken: process.env.SIGNOZ_REFRESH_AUTH_TOKEN!,
  tokenStore: new FileTokenStore(".signoz-session.json"),
});
```

- Chaque appel envoie `Authorization: Bearer <authToken>`.
- A 401 déclencheurs `POST /api/v2/sessions/rotate` et l'appel est repris une fois. La rotation est un seul vol : appels
  simultanés qui obtiennent un 401 partage une rotation.
- Une rotation refusée lance `SignozSessionExpiredError`: copier des jetons frais depuis le navigateur.
- La session expire après 7 jours d'inactivité ou 30 jours au total.
- Avec `opaque` tokenizer, le SDK et le navigateur rivalisent pour la même session. Préférez la clé API, ou
  connectez-vous juste pour cela dans une fenêtre privée.

### Garder la paire tournante

Une paire tournante vit en mémoire à moins de la garder :

- `onTokensRotated(tokens)` est appelé à chaque rotation, pour persister la paire vous-même.
- `tokenStore` persiste pour vous. `FileTokenStore` écrit un fichier JSON avec le mode 0600 (sur Windows l'ACL du
  dossier le protège), par le biais d'un renomme qui reprend alors qu'un autre processus détient le fichier.

Le magasin se souvient de la paire de celui qui est sauvé (`tokenPairHash`) . Au prochain départ, la paire enregistrée
gagne alors que la paire donnée est inchangée, puisqu'elle est plus récente; une fois que vous collez une nouvelle
paire, la nouvelle paire gagne.

`createSignozClientFromEnv()` met cela en place sur son propre: il maintient la paire dans `SIGNOZ_TOKEN_FILE` ou
`.signoz-session.json` (`tokenFile: false` Éteins ça).

`signoz.auth` indique le mode utilisé par le client (`"api_key"` ou `"session"`), et `signoz.tokens` donne la paire
actuelle.
