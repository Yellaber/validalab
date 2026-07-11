## MODIFIED Requirements

### Requirement: Sobre de respuesta paginada
El sistema SHALL devolver toda colección dentro del sobre `RespuestaPaginada`: un objeto con `datos` (el array de elementos de la página) y `paginacion` con `pagina`, `porPagina`, `total` y `totalPaginas`. La fundación SHALL proveer un constructor/genérico reutilizable que calcule el bloque `paginacion` a partir de la página solicitada y el total disponible, y SHALL proveer además un **esquema de respuesta reutilizable** (paramétrico por el tipo de elemento) para declarar el sobre, de modo que ningún módulo reimplemente la forma `{ datos, paginacion }`. La forma observable de la respuesta SHALL ser idéntica en todas las colecciones.

#### Scenario: Respuesta de una colección
- **WHEN** un endpoint de colección responde una página de resultados
- **THEN** la respuesta tiene la forma `{ datos: [...], paginacion: { pagina, porPagina, total, totalPaginas } }`

#### Scenario: Cálculo de totalPaginas
- **WHEN** hay 45 elementos disponibles y `porPagina=20`
- **THEN** `paginacion.total` es 45 y `paginacion.totalPaginas` es 3

#### Scenario: Sobre declarado con el esquema compartido
- **WHEN** un módulo declara la respuesta paginada de su colección
- **THEN** la deriva del esquema de respuesta reutilizable de la fundación, sin reescribir el bloque `{ datos, paginacion }`
