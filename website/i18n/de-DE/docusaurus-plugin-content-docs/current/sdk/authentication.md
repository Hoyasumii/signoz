---
sidebar_position: 2
title: Authentifizierung
description: "Ein Dienstkonto-API-Schlüssel oder die Token der Browsersitzung mit automatischer Rotation und einer Token-Datei."
---

# Authentifizierung

Der Kunde nimmt **entweder** einen API-Schlüssel **oder** Das Token-Paar der Browsersitzung. Beides ist ein
`SignozConfigError`.

## API Key (empfohlen)

In SigNoz, offen **Einstellungen → Service Accounts**Erstellen Sie ein Konto mit der Rolle, die Sie benötigen, und
generieren Sie einen Schlüssel.

```ts
const signoz = createSignozClient({ baseUrl, apiKey: process.env.SIGNOZ_API_KEY! });
```

Der Schlüssel geht in die `SigNoz-Api-Key` Header (exportiert als) `API_KEY_HEADER`. Es läuft nicht mit einer Sitzung ab
und konkurriert nicht mit Ihrem Browser um eine.

## Browsersitzung

mit SigNoz offen und eingeloggt, DevTools öffnen **Anwendung: Local Storage** → die SigNoz URL und Kopie `AUTH_TOKEN`
und `REFRESH_AUTH_TOKEN`.

```ts
import { createSignozClient, FileTokenStore } from "@hoyasumii/signoz";

const signoz = createSignozClient({
  baseUrl,
  authToken: process.env.SIGNOZ_AUTH_TOKEN!,
  refreshAuthToken: process.env.SIGNOZ_REFRESH_AUTH_TOKEN!,
  tokenStore: new FileTokenStore(".signoz-session.json"),
});
```

- Jeder Anruf sendet `Authorization: Bearer <authToken>`.
- A 401 Trigger `POST /api/v2/sessions/rotate` Der Anruf wird einmal wiederholt. Die Rotation ist Single-Flight:
  gleichzeitige Anrufe, die eine 401 Share One Rotation erhalten.
- Ein abgelehnter Rotationswurf `SignozSessionExpiredError`Kopieren Sie neue Token aus dem Browser.
- Die Sitzung läuft nach 7 Leerlauftagen oder insgesamt 30 Tagen ab.
- Mit dem `opaque` Tokenizer, SDK und Browser konkurrieren um die gleiche Sitzung. Bevorzugen Sie den API-Schlüssel oder
  melden Sie sich nur dafür in einem privaten Fenster an.

### Das gedrehte Paar halten

Ein rotiertes Paar lebt im Gedächtnis, es sei denn, Sie behalten es:

- `onTokensRotated(tokens)` ist bei jeder Rotation aufgerufen, das Paar selbst zu beharren.
- `tokenStore` Beharrt es für dich. `FileTokenStore` schreibt eine JSON-Datei mit dem Modus 0600 (unter Windows schützt
  die ACL des Ordners sie), durch einen Umnamen, der wiederholt wird, während ein anderer Prozess die Datei enthält.

Der Laden erinnert sich, von welchem Paar der gerettete abstammt.`tokenPairHash`. Beim nächsten Start gewinnt das
gespeicherte Paar, während das angegebene Paar unverändert ist, da es neuer ist; Sobald Sie ein neues Paar einfügen,
gewinnt das neue Paar.

`createSignozClientFromEnv()` stellt dies selbst auf: es hält das paar in. `SIGNOZ_TOKEN_FILE` oder
`.signoz-session.json` ()`tokenFile: false` schaltet das aus.

`signoz.auth` Sagt, welchen Modus der Client verwendet ()`"api_key"` oder `"session"`, und `signoz.tokens` gibt das
aktuelle Paar.
