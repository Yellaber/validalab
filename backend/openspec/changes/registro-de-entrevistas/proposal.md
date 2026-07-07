## Why

Con el guión ya disponible (chunk A) y el CRM de contactos (E3), falta el corazón del descubrimiento: **registrar las entrevistas**. Una entrevista vincula una idea, un contacto y un guión, y captura las respuestas (y citas) que después alimentan el scoring del agente (chunk C) y los KPIs (E5). Este chunk entrega el registro y la gestión de entrevistas **sin IA**: el scoring queda `pendiente` (lo activará el chunk C, tras adelantar BYOK).

## What Changes

- **Sub-dominio `entrevista/`** en el módulo `entrevistas` (junto al `guion/` del chunk A).
- **Entidad `Entrevista`** (TypeORM): vinculada a `ideaId` (path), `contactoId` y `guionId`. `respuestas` (`{preguntaId, texto}[]`) y `citas` (`{id, texto, contexto?}[]`) como jsonb embebido; `estadoScoring` (`pendiente`|`puntuada`|`fallida`); `score` y `ajuste` como jsonb **nullable**. FK `idea_id → ideas` ON DELETE CASCADE. Migración de la tabla `entrevistas`.
- **Registro** (`POST /ideas/{id}/entrevistas`): valida el vínculo — `contactoId` debe ser un contacto de la misma idea y `guionId` un guión propio; si no, `422 ENTREVISTA_SIN_VINCULO` (RNF-14). Crear la entrevista **mueve el contacto a `entrevistado`** (el estado reservado en E3); un contacto ya `entrevistado`/`descartado` → `409 CONFLICTO`. Nace con `estadoScoring` `pendiente` y `score`/`ajuste` `null`.
- **Consulta/edición**: `GET` (paginado + filtros `contactoId`/`estadoScoring`), `GET/{id}`, `PATCH` (edita `respuestas`/`citas`; cambiar `respuestas` reinicia `estadoScoring` a `pendiente` e invalida el `score`; solo `citas` no afecta), `DELETE` (`204`).
- **Ajuste manual** (`POST .../ajuste-score`): registra `scoreAjustado` + `nota` conservando ambos valores (el `score` del agente —cuando exista— y el `ajuste`); `422` si `scoreAjustado` fuera de `0–10` o sin `nota`.
- **Dependencia entre módulos**: `EntrevistasModule` importa `IdeasModule` (asegurarPropia) y `ContactosModule` (validar el contacto de la idea + marcarlo `entrevistado`); el guión se resuelve en el mismo módulo. `ContactosModule` **exporta** `ContactosService`.

**Fuera de alcance** (chunk C, tras BYOK/E7): el agente (LangGraph.js), el scoring automático, `POST .../puntuar`, y el registro de tokens/costo/idempotencia del `score`.

## Capabilities

### New Capabilities
- `gestion-de-entrevistas`: registro de una entrevista vinculada a idea+contacto+guión (con validación de vínculo y transición del contacto a `entrevistado`), listado/consulta con filtros, edición de respuestas/citas, ajuste manual del score y eliminación.

### Modified Capabilities
<!-- Ninguna a nivel de requisito. Se reutilizan `gestion-de-ideas`, `gestion-de-contactos`/`embudo-de-outreach` (marcar entrevistado) y `gestion-de-guiones` sin cambiar su comportamiento observable. -->

## Impact

- **Código**: `src/entrevistas/entrevista/` (entidad, DTOs, service, controller, mapeador). `ContactosService` gana métodos para el vínculo (`asegurarVinculoConIdea`) y la transición a `entrevistado`; `ContactosModule` lo exporta. `GuionesService` gana un método de vínculo. Nueva excepción `EntrevistaSinVinculoException` (código `ENTREVISTA_SIN_VINCULO`, 422). `EntrevistasModule` importa `IdeasModule` + `ContactosModule`.
- **Persistencia**: migración de la tabla `entrevistas`.
- **Reutiliza la fundación E0–E4**: DTOs Zod + pipe global, sobre `Error`/`CodigoError` + filtro, guard global, `@OwnerId()`, paginación, y la verificación de idea propia.
- **Contrato**: implementa la porción de registro/CRUD de entrevistas del tag `entrevistas`. No lo modifica.
- **Sin dependencias nuevas.**
