---
sidebar_position: 6
title: Herramientas genéricas
description: "signoz_resources, signoz_describe y signoz_call: cada otra operación de la SigNoz REST API."
---

# Herramientas genéricas

Las herramientas curadas cubren telemetría, alertas y paneles. Para todo lo demás (visitas salvadas, canales de
notificación, tiempos de inactividad, cuentas de servicio, usuarios, ...) tres herramientas alcanzan las otras ~230
operaciones de la API REST.

1. **`signoz_resources`** lista los servicios y sus operaciones. Con un `query` (G)e.g. `saved view`, `downtime`,
   `notification channel`Sólo los que coinciden.
2. **`signoz_describe`** da la firma completa de una operación: parámetros de ruta y consulta, el esquema corporal, el
   permiso que necesita y un ejemplo `signoz_call` entrada. Con `schema`, expande un esquema de la especificaciones
   (`depth` niveles profundos, por defecto 3).
3. **`signoz_call`** lo ejecuta: `operation` es `service.method` (G)`savedView.createSavedView`) o el `operationId`
   (G)`CreateSavedView`), y `args` ostenciones `path`, `query` y `body`.

```json
{ "operation": "rules.listRules", "args": {} }
```

## Seguridad

- Los parámetros desconocidos son rechazados, por lo que un tipo no deja caer silenciosamente un filtro.
- Operaciones destructivas (delete, revocación, desconexión, desbloqueo) `confirm: true`Se le dice al agente que le
  pregunte primero.
- Operaciones de ciclo de vida de sesión, callbacks SSO y la exportación cruda se quedan fuera del catálogo.
- Una respuesta larga es cortada a 60.000 caracteres, diciendo eso.

El catálogo se genera a partir de la misma especta de OpenAPI que el SDK`pnpm codegen:mcp`).
