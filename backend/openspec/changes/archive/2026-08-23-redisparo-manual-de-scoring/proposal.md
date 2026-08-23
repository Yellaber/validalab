## Why

El scoring del agente se dispara automáticamente al registrar una entrevista y al editar sus `respuestas`, pero ese disparo es asíncrono y puede terminar en `fallida` (sin BYOK, proveedor caído, salida no válida tras reintentos). El SRS (RF-09b) y el contrato (`POST /ideas/{id}/entrevistas/{idEntrevista}/puntuar`, operationId `puntuarEntrevista`) exigen un **re-disparo manual** del scoring para que el usuario pueda reintentar sobre una entrevista `fallida` (o `pendiente`) sin tener que reeditarla.

Este endpoint ya está definido en el contrato pero **no estaba implementado** en el backend: es la única brecha de paridad de contrato del MVP (56/57 → 57/57). El frontend ya lo consume, de modo que hoy recibiría un `404`.

## What Changes

- **Nuevo endpoint** `POST /ideas/{id}/entrevistas/{idEntrevista}/puntuar`: (re)dispara el scoring del agente sobre una entrevista propia y devuelve `200` con la entrevista y su `estadoScoring` actualizado. Sin cuerpo de petición; el bloque `score` es de solo lectura.
- **Re-disparo síncrono:** a diferencia del disparo automático (asíncrono, para no bloquear el registro/edición), el re-disparo manual **espera** a que el agente termine y devuelve el estado final (`puntuada` o `fallida`), reutilizando `AgenteService.solicitarScoring` —que traga sus errores (una salida no válida deja la entrevista `fallida` sin romper el flujo) y omite por idempotencia si nada cambió (RF-22c)—. Por eso el endpoint no expone `409`/`503`: un fallo del agente se refleja en el `estadoScoring`, no en el código HTTP.
- Idea ajena → `403 ACCESO_DENEGADO`; idea o entrevista inexistente → `404 RECURSO_NO_ENCONTRADO`.

## Capabilities

### New Capabilities
_(ninguna)_

### Modified Capabilities
- `scoring-inteligente-de-entrevistas`: añade el re-disparo manual del scoring (endpoint `puntuar`), complementando el disparo automático existente.

## Impact

- **Código:** `EntrevistasService.puntuar(ownerId, ideaId, idEntrevista)` (nuevo) y la ruta `POST :idEntrevista/puntuar` en `EntrevistasController`. Reutiliza `AgenteService.solicitarScoring` (idempotencia + traga errores), `IdeasService.asegurarPropia` (aislamiento) y `buscarEnIdea` (404). Sin DTO nuevo (sin cuerpo; se reutiliza `IdEntrevistaParamDto`).
- **Persistencia:** sin cambios de esquema (reutiliza `entrevistas` y el ledger `ejecuciones_agente`).
- **Contrato:** `contrato-api/openapi.yaml` ya define el endpoint; no requiere cambios. Cierra la última brecha de paridad de contrato del backend (57/57).
