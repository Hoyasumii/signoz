---
sidebar_position: 2
title: Autenticación
description: "Una clave de API de cuenta de servicio, o las fichas de la sesión del navegador con rotación automática y un archivo token."
---

# Autenticación

El cliente toma **o** una clave de API **o** el par de token de la sesión del navegador. Pasar ambos es un
`SignozConfigError`.

## Clave de API (recomendada)

In SigNoz, abierto **Ajustes → Cuentas de Servicio**, crear una cuenta con el papel que necesita y generar una clave.

```ts
const signoz = createSignozClient({ baseUrl, apiKey: process.env.SIGNOZ_API_KEY! });
```

La llave va en `SigNoz-Api-Key` header (exportado como `API_KEY_HEADER`). No expira con una sesión y no compite con su
navegador para uno.

## Sesión del navegador

Con SigNoz abierto y conectado, abierto DevTools → **Aplicación → Almacenamiento local** → el SigNoz URL y copia
`AUTH_TOKEN` y `REFRESH_AUTH_TOKEN`.

```ts
import { createSignozClient, FileTokenStore } from "@hoyasumii/signoz";

const signoz = createSignozClient({
  baseUrl,
  authToken: process.env.SIGNOZ_AUTH_TOKEN!,
  refreshAuthToken: process.env.SIGNOZ_REFRESH_AUTH_TOKEN!,
  tokenStore: new FileTokenStore(".signoz-session.json"),
});
```

- Cada llamada envía `Authorization: Bearer <authToken>`.
- Un 401 dispara `POST /api/v2/sessions/rotate` y la llamada se retira una vez. El rotato es un solo vuelo: llamadas
  simultáneas que consiguen un 401 compartir uno girar.
- Un giro rechazado `SignozSessionExpiredError`: copiar fichas frescas del navegador.
- La sesión expira después de 7 días ociosos o 30 días en total.
- Con la `opaque` tokenizer, el SDK y el navegador compiten para la misma sesión. Preferir la clave de API, o iniciar
  sesión sólo para esto en una ventana privada.

### Mantener el par girado

Un par rotado vive en memoria a menos que lo guardes:

- `onTokensRotated(tokens)` es llamado a cada rotación, para persistir el par usted mismo.
- `tokenStore` persiste para ti. `FileTokenStore` escribe un archivo JSON con el modo 0600 (en Windows el ACL de la
  carpeta lo protege), a través de un renombre que se repite mientras otro proceso mantiene el archivo.

La tienda recuerda que pare el salvado descende de (`tokenPairHash`). En el próximo comienzo, el par salvado gana
mientras el par dado no se cambia, ya que es más nuevo; una vez que se pega un nuevo par, el nuevo par gana.

`createSignozClientFromEnv()` establece esto por su cuenta: mantiene el par en `SIGNOZ_TOKEN_FILE` o
`.signoz-session.json` (G)`tokenFile: false` apaga eso).

`signoz.auth` dice qué modo utiliza el cliente (`"api_key"` o `"session"`), y `signoz.tokens` da el par actual.
