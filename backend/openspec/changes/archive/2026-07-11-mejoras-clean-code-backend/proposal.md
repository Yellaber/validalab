## Why

El backend del MVP está completo y con 236 tests verdes, pero una revisión detecta varias **duplicaciones concretas** que erosionan el DRY y dificultan el mantenimiento: cuando cambie una fórmula o un texto normativo habrá que tocarlo en varios sitios (riesgo de divergencia). Son mejoras de calidad interna, **sin cambio de comportamiento**: refactorizaciones acotadas y cubiertas por los tests existentes, para que el código sea más fácil de evolucionar (los KPIs/costo/paginación son transversales y crecerán).

## What Changes

- **Esquema de paginación reutilizable:** el bloque de respuesta `{ datos, paginacion }` está reescrito a mano en 7 `*-respuesta.ts` (entrevistas, guiones, ideas, contactos, alertas, veredictos, usuarios). Se extrae un helper `esquemaPaginado(item)` + un `paginacionSchema` compartido en `common/pagination`, y cada respuesta lo reutiliza.
- **Cálculo de costo único:** la fórmula `tokens/1e6 × precio` está duplicada en `CostoService` y `ReevaluacionService`. Se centraliza en un único punto (un método `costoDe(precio, tokensEntrada, tokensSalida)` de `PreciosService`), consumido por ambos.
- **Aclaración normativa única:** el texto "es un estimado, no el saldo" (SRS §8.9.1) está duplicado en `CostoService` y `ReevaluacionService`. Se extrae a una constante compartida.
- **Pequeñas mejoras de claridad:** `CostoService.costoUsuario` recomputa `proveedorDe(ejecuciones)` cuatro veces → se calcula una sola vez; la comprobación de idempotencia por hash duplicada en `AgenteService` (`solicitarScoring` y `reevaluar`) → se extrae a un predicado privado `estaAlDia(entrevista, hash)`.

## Capabilities

### New Capabilities
_(ninguna)._

### Modified Capabilities
- `paginacion-colecciones`: se fortalece el requisito del sobre de respuesta paginada para exigir que la fundación provea un **esquema de respuesta reutilizable** (no solo el constructor runtime), de modo que ningún módulo reimplemente el bloque `{ datos, paginacion }`. El comportamiento observable (la forma de la respuesta) es idéntico; se estandariza cómo se declara.

## Impact

- **Código:** `common/pagination/` gana `esquemaPaginado`; los 7 `*-respuesta.ts` con paginación lo reutilizan. `PreciosService` gana `costoDe`; `CostoService` y `ReevaluacionService` lo consumen y comparten la aclaración. `AgenteService` extrae `estaAlDia`.
- **Sin cambios** de persistencia, migraciones, contrato ni endpoints. Ninguna respuesta cambia de forma.
- **Verificación:** los 236 tests existentes deben seguir verdes sin modificarlos (salvo ajustes de import si un tipo se re-exporta); `build` y `eslint` limpios. Es la red de seguridad de que el comportamiento no cambió.
- **Fuera de alcance:** reescrituras mayores, cambios de arquitectura de módulos, o "patrones por el patrón". Solo se atacan duplicaciones reales detectadas.
