## Why

E4 (entrevistas + scoring) es la épica más grande y su scoring depende del agente y de BYOK. Este change abre E4 por su pieza más autónoma y sin IA: el **guión de entrevista reutilizable**. Una entrevista se registra guiada por un guión; sin guiones, el registro de entrevistas (chunk siguiente) no tiene de dónde partir. Es un recurso de nivel de usuario (reutilizable entre ideas), así que es un buen primer corte, acotado y sin dependencias de agente/BYOK.

## What Changes

- **Módulo `entrevistas`** (nuevo, RNF-10), estrenado con su primer sub-dominio `guion/` (el siguiente chunk añadirá `entrevista/`).
- **Entidad `Guion`** (TypeORM): recurso de usuario con `nombre`, `descripcion?` y `preguntas` ordenadas. FK `owner_id → usuarios` ON DELETE CASCADE. `preguntas` se persiste como **jsonb embebido** (`{id, orden, texto}[]`): son value-objects sin identidad ni ciclo de vida propios, siempre leídos/escritos con el guión. Migración de la tabla `guiones`.
- **CRUD de `/guiones`** (autenticado, nivel de usuario; aislado por `owner_id` del token):
  - `POST /guiones` — crea con `nombre` y `preguntas` (≥ 1); genera el `id` de cada pregunta; `201`.
  - `GET /guiones` — listado propio paginado.
  - `GET /guiones/{idGuion}` — consulta; ajeno → `403`, inexistente → `404`.
  - `PATCH /guiones/{idGuion}` — edita `nombre`/`descripcion`/`preguntas` (reemplaza el conjunto ordenado).
  - `DELETE /guiones/{idGuion}` — `204`.

**Fuera de alcance**: registrar entrevistas y vincularlas al guión (chunk B), el scoring por IA y el agente (chunk C, tras adelantar BYOK/E7).

## Capabilities

### New Capabilities
- `gestion-de-guiones`: alta, listado paginado, consulta, edición (reemplazando el conjunto ordenado de preguntas) y eliminación de los guiones de entrevista reutilizables del usuario, aislados por `owner_id`.

### Modified Capabilities
<!-- Ninguna. -->

## Impact

- **Código**: nuevo `src/entrevistas/` con el módulo y el sub-dominio `guion/` (entidad, DTOs Zod, service, controller, mapeador). `AppModule` importa `EntrevistasModule`.
- **Persistencia**: migración de la tabla `guiones` (FK a `usuarios`, `preguntas` jsonb).
- **Reutiliza la fundación E0**: DTOs `createZodDto` + pipe global, sobre `Error`/`CodigoError` + filtro, `JwtAuthGuard` global, `@OwnerId()`, paginación. El aislamiento por `owner_id` sigue el patrón de `ideas` (`buscarPropio` → 403/404).
- **Contrato**: implementa la porción de guiones del tag `entrevistas` del OpenAPI. No lo modifica.
- **Sin dependencias nuevas.**
