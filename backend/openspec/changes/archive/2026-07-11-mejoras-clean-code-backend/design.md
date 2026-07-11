## Context

Refactorización de calidad sobre un backend NestJS + Zod ya completo (E0–E8, 236 tests). El objetivo es eliminar duplicaciones concretas detectadas en una revisión, sin cambiar comportamiento. La red de seguridad es la suite de tests + `build` + `eslint`: deben quedar verdes sin reescribir los asserts (salvo imports).

## Goals / Non-Goals

**Goals:**
- Un único punto para: el esquema de respuesta paginada, la fórmula de costo, y el texto normativo de la aclaración.
- Legibilidad: eliminar recomputaciones y extraer predicados con nombre.

**Non-Goals:**
- Cambiar contratos, endpoints, respuestas o persistencia.
- Reestructurar módulos o introducir patrones sin una duplicación real que los justifique.
- Tocar tests salvo ajustes de import.

## Decisions

### D1 — `esquemaPaginado(item)` en `common/pagination`
Se añade un `paginacionSchema` (`{ pagina, porPagina, total, totalPaginas }` como enteros) y un helper genérico `esquemaPaginado(item: ZodType)` que devuelve `z.object({ datos: z.array(item), paginacion: paginacionSchema })`. Cada `*Paginadas` (entrevistas, guiones, ideas, contactos, alertas, veredictos, usuarios) pasa de reescribir el bloque a `createZodDto(esquemaPaginado(<itemSchema>))`. El tipo runtime `RespuestaPaginada<T>` y `crearRespuestaPaginada` ya existen y no cambian; esto unifica solo el ESQUEMA de respuesta. *Alternativa descartada:* dejar la duplicación — divergiría si cambia el bloque de paginación.

### D2 — `costoDe(precio, tokensEntrada, tokensSalida)` como función pura
La fórmula `(tokensEntrada/1e6)·precioEntrada + (tokensSalida/1e6)·precioSalida` vive hoy en `CostoService.costoEjecucion` y en `ReevaluacionService.costo`. Se centraliza en una **función pura** `costoDe` (`proveedores/precios/precio.util.ts`), consumida por ambos: `CostoService` por ejecución (buscando el precio en el mapa) y `ReevaluacionService` sobre los tokens agregados. Un cálculo sin estado pertenece a una función pura, no a un método de service (los services orquestan IO); además así los tests no necesitan mockear el cálculo. *Alternativa descartada:* método en `PreciosService` — acopla el cálculo a un colaborador mockeado y ensucia la superficie del service.

### D3 — Aclaración normativa compartida
El texto de la aclaración (SRS §8.9.1) se extrae a una constante exportada (`ACLARACION_COSTO` en un módulo de `proveedores/costo` o `common`), consumida por `CostoService` y `ReevaluacionService`. Un solo texto normativo, sin riesgo de que diverjan.

### D4 — Limpieza local en `CostoService` y `AgenteService`
- `CostoService.costoUsuario`: `proveedorDe(ejecuciones)` se calcula UNA vez en una variable y se reutiliza (hoy se llama 4 veces, recomputando).
- `AgenteService`: el bloque `entrevista.estadoScoring === 'puntuada' && entrevista.score?.hashEntrada === hash` aparece en `solicitarScoring` y `reevaluar`; se extrae a un método privado `estaAlDia(entrevista, hash): boolean` con nombre expresivo.

## Risks / Trade-offs

- **Un refactor podría alterar comportamiento por descuido** → mitigación: cada paso mantiene la suite de tests verde sin reescribir asserts (solo imports); `build` + `eslint` en cada paso. Si algún test exige cambiar un assert de forma no trivial, es señal de cambio de comportamiento y se revierte.
- **Sobre-abstracción** → se limita estrictamente a las duplicaciones detectadas; no se introducen helpers especulativos.
- **`esquemaPaginado` y los DTOs de Swagger** → `createZodDto` sobre el esquema compuesto debe seguir exponiendo el mismo esquema OpenAPI; se verifica que `/docs-json` no cambie de forma para las colecciones afectadas.
