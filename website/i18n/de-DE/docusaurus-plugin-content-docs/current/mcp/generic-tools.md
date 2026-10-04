---
sidebar_position: 6
title: Generische Werkzeuge
description: "signoz_resources, signoz_describe und signoz_callJede andere Operation der SigNoz REST-API."
---

# Generische Werkzeuge

Die kuratierten Tools umfassen Telemetrie, Warnungen und Dashboards. Für alles andere (gespeicherte Ansichten,
Benachrichtigungskanäle, Ausfallzeiten, Dienstkonten, Benutzer, ...) erreichen drei Tools die anderen ~230 Operationen
der REST-API.

1. **`signoz_resources`** listet die Dienste und ihre Operationen auf. mit a `query` ()e.g. `saved view`, `downtime`,
   `notification channel`Nur die passenden.
2. **`signoz_describe`** gibt die vollständige Signatur einer Operation: Pfad- und Abfrageparameter, das Körperschema,
   die benötigte Berechtigung und ein Beispiel `signoz_call` Input. mit `schema`, erweitert es ein Schema aus der
   Spezifikation (`depth` Pegeltiefe, Standardwert 3.
3. **`signoz_call`** läuft es: `operation` ist `service.method` ()`savedView.createSavedView`) oder `operationId`
   ()`CreateSavedView`, und `args` Bestände `path`, `query` und `body`.

```json
{ "operation": "rules.listRules", "args": {} }
```

## Sicherheit

- Unbekannte Parameter werden abgelehnt, so dass ein Tippfehler einen Filter nicht stillschweigend fallen lässt.
- Zerstörungsoperationen (Löschen, Entziehen, Trennen, Entsperren) erforderlich `confirm: true`Der Agent wird
  aufgefordert, Sie zuerst zu fragen.
- Session-Lifecycle-Operationen, SSO-Callbacks und der Rohexport werden aus dem Katalog ausgeschlossen.
- Eine lange Antwort wird auf 60.000 Zeichen geschnitten, so zu sagen.

Der Katalog wird aus der gleichen OpenAPI-Spezifikation wie das SDK generiert.`pnpm codegen:mcp`.
