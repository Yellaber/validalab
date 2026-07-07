## Why

Con E1–E2 cerradas (ideas, hipótesis, umbrales), el usuario ya sabe qué probar, pero no tiene **a quién entrevistar**. La validación se alimenta de entrevistas, y las entrevistas salen de un pipeline de contactos gestionado. La épica E3 entrega ese CRM: registrar personas candidatas por idea y moverlas por el embudo de outreach hasta que estén listas para entrevistar (E4). Sin contactos, E4 (entrevistas + scoring) no puede existir.

## What Changes

- **Módulo `contactos`** (nuevo, RNF-10): primer módulo de dominio separado que **depende de `ideas`** — reutiliza `IdeasService.asegurarPropia` para heredar el aislamiento de la idea (`IdeasModule` exporta el servicio, `ContactosModule` lo importa).
- **Entidad `Contacto`** (TypeORM): `nombre`, `perfil?`, `enlace?`, `canal`, `origen`, `referidoPorId?` (auto-referencia a otro contacto de la misma idea), `estado` del embudo, `primerToqueEn?`, `segundoToqueEn?`, `notas?`. FK `idea_id → ideas` ON DELETE CASCADE y FK `referido_por_id → contactos` ON DELETE SET NULL. Migración de la tabla `contactos`.
- **CRUD** (autenticado, anidado bajo la idea):
  - `POST /ideas/{id}/contactos` — crea en `por_contactar` (canal/origen con default si se omiten); valida `referidoPorId` contra contactos de la misma idea.
  - `GET /ideas/{id}/contactos` — paginado + filtro opcional por `estado`.
  - `GET`/`PATCH`/`DELETE /ideas/{id}/contactos/{idContacto}` — consulta, edición de contenido (nunca `estado` ni fechas de toque), y borrado (`204`).
- **Embudo de outreach**:
  - `POST /ideas/{id}/contactos/{idContacto}/estado` — máquina de estados `por_contactar → contactado → respondio → agendado`, con `descartado` desde cualquier no-terminal; transición inválida o `entrevistado` (solo E4) → `409`; estado fuera del catálogo → `422`.
  - `POST /ideas/{id}/contactos/{idContacto}/toques` — registra hasta **2 toques** (`primerToqueEn`/`segundoToqueEn`); el tercero → `409`.

**Fuera de alcance**: registrar entrevistas y asignar el estado `entrevistado` (E4); el guión de entrevista (E4).

## Capabilities

### New Capabilities
- `gestion-de-contactos`: alta, listado paginado (con filtro por estado), consulta, edición de contenido y eliminación de los contactos de una idea propia, con la cadena de referidos (`referidoPorId`), aislados a través de la idea.
- `embudo-de-outreach`: avance de un contacto por los estados del embudo (con `descartado` como salida y `entrevistado` reservado a E4) y registro de toques de outreach con el límite de dos.

### Modified Capabilities
<!-- Ninguna a nivel de requisito. `gestion-de-ideas` se reutiliza (verificación de idea propia) exponiendo `IdeasService`; su comportamiento observable no cambia. -->

## Impact

- **Código**: nuevo `src/contactos/` (organizado según la convención del módulo). `ContactosController`, `ContactosService`, entidad `Contacto`, DTOs Zod, mapeador `aContactoDto`, y la máquina de estados del embudo. `IdeasModule` **exporta** `IdeasService`; `AppModule` importa `ContactosModule`.
- **Persistencia**: migración de la tabla `contactos` (FK a `ideas` y auto-FK de referido).
- **Reutiliza la fundación E0–E2**: DTOs `createZodDto` + pipe global, sobre `Error`/`CodigoError` + filtro, `JwtAuthGuard` global, `@OwnerId()`, paginación, y la verificación de idea propia de `gestion-de-ideas`.
- **Contrato**: implementa el tag `contactos` del OpenAPI. No lo modifica.
- **Sin dependencias nuevas.**
