## Context

Sobre E0–E4. El contrato (tag `proveedores`, `GET /proveedores`) fija:

- `ProveedorId`: `anthropic` | `openai` | `google` (enum fijo del contrato).
- `ModeloIA { id(cadena), nombre, descripcion? }` — el `id` es un **dato** del catálogo curado (p. ej. `claude-opus-4-8`), actualizable sin redesplegar (RNF-18), no un enum.
- `ProveedorIA { id(ProveedorId), nombre, modelos: ModeloIA[] }`.

El catálogo es **global** (curado por administración), requiere autenticación pero no se aísla por usuario.

## Goals / Non-Goals

**Goals:**
- Servir el catálogo curado de proveedores + modelos, con los modelos como datos actualizables sin redesplegar.
- Dejar el módulo `proveedores` estrenado para que E7b añada `configuracion/` sin refactor.

**Non-Goals:**
- Configuración BYOK, cifrado y validación de la key (E7b).
- Precios y costo (E8).
- CRUD administrativo del catálogo por API: la curación inicial es por seed/UPDATE en BD (no hay panel de admin aún).

## Decisions

### D1 — Proveedores fijos (código), modelos como dato (BD)
El **conjunto de proveedores** es fijo: lo fija el enum `ProveedorId` del contrato (los 3 soportados), y su nombre visible (`Anthropic`/`OpenAI`/`Google`) vive en una constante `PROVEEDORES` en código. Los **modelos**, en cambio, son datos: tabla `modelos_ia` sembrada, actualizable con un UPDATE sin redesplegar (RNF-18). Así se cumple "los ids de modelo son datos, no un enum del contrato" sin exponer un CRUD de catálogo todavía.

### D2 — Entidad `ModeloIA` y seed inicial
Tabla `modelos_ia`: `id uuid`, `proveedor` (varchar, `ProveedorId`), `modelo_id` (varchar, el id del modelo en el proveedor), `nombre`, `descripcion?`, `orden` (int, para ordenar dentro del proveedor). Índice por `proveedor`. La migración crea la tabla y **siembra** un catálogo inicial curado por proveedor (Anthropic con sus modelos actuales; OpenAI y Google con un conjunto inicial razonable). El seed es dato inicial: administración lo ajusta por BD sin redesplegar.

### D3 — Composición del catálogo en `GET /proveedores`
`CatalogoService.listar()` carga todos los `ModeloIA` (ordenados por `proveedor`, `orden`) y los agrupa por proveedor, proyectando por cada `ProveedorId` de `PROVEEDORES` un `ProveedorIA { id, nombre, modelos }`. Un proveedor sin modelos sembrados aparece con `modelos: []`. La respuesta es un arreglo de `ProveedorIA` en el orden de `PROVEEDORES`.

### D4 — DTOs y organización
Tipos Zod: `proveedorIdSchema`, `modeloIaSchema`, `proveedorIaSchema`; DTO de respuesta `ProveedorIaDto` (arreglo publicado en Swagger). `GET /proveedores` está protegido por el guard global (sin `@Publico()`): requiere token, sin filtrar por `owner_id` (catálogo global). El módulo `proveedores` arranca con el sub-dominio `catalogo/`; E7b añadirá `configuracion/`.

## Risks / Trade-offs

- **Seed con ids de modelo que cambian rápido** → aceptado y es justo el motivo de que sean datos (RNF-18): se actualizan por BD. El seed es un punto de partida, no la verdad perpetua.
- **Sin CRUD de catálogo por API** → suficiente para E7/MVP; la curación es por seed/UPDATE. Un panel de administración es trabajo futuro.
- **Migración a mano tras `migration:generate`** → se limpia el ruido y se añaden los INSERT del seed; se verifica `run`/`revert`/`run`.

## Migration Plan

1. Tipos Zod (`ProveedorId`, `ModeloIA`, `ProveedorIA`) + constante `PROVEEDORES` (nombres visibles).
2. Entidad `ModeloIA` + migración de la tabla `modelos_ia` con el seed inicial.
3. `CatalogoService` (agrupa por proveedor) + `CatalogoController` (`GET /proveedores`).
4. `ProveedoresModule` en `AppModule`.
5. Verificar contra la BD (Docker): `GET /proveedores` (200 con los 3 proveedores y sus modelos; 401 sin token). Rollback: revertir la migración.

## Open Questions

- **Ninguna abierta.** El BYOK, el cifrado y la validación de la key quedan explícitamente en E7b.
