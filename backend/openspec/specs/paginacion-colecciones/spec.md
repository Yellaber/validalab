# paginacion-colecciones Specification

## Purpose
TBD - created by archiving change fundacion-e0. Update Purpose after archive.
## Requirements
### Requirement: Parámetros de paginación uniformes
El sistema SHALL aceptar en los endpoints de colección los parámetros de consulta `pagina` y `porPagina` con la semántica del contrato: `pagina` entero ≥ 1 (por defecto 1) y `porPagina` entero entre 1 y 100 (por defecto 20). Valores fuera de rango o no enteros SHALL rechazarse como `VALIDACION_FALLIDA`. La fundación SHALL proveer un DTO de paginación reutilizable para que ningún módulo reimplemente esta validación.

#### Scenario: Parámetros omitidos
- **WHEN** se solicita una colección sin `pagina` ni `porPagina`
- **THEN** se aplican los valores por defecto `pagina=1` y `porPagina=20`

#### Scenario: porPagina fuera de rango
- **WHEN** se solicita una colección con `porPagina=500`
- **THEN** la petición se rechaza con `codigo` `VALIDACION_FALLIDA`

### Requirement: Sobre de respuesta paginada
El sistema SHALL devolver toda colección dentro del sobre `RespuestaPaginada`: un objeto con `datos` (el array de elementos de la página) y `paginacion` con `pagina`, `porPagina`, `total` y `totalPaginas`. La fundación SHALL proveer un constructor/genérico reutilizable que calcule el bloque `paginacion` a partir de la página solicitada y el total disponible.

#### Scenario: Respuesta de una colección
- **WHEN** un endpoint de colección responde una página de resultados
- **THEN** la respuesta tiene la forma `{ datos: [...], paginacion: { pagina, porPagina, total, totalPaginas } }`

#### Scenario: Cálculo de totalPaginas
- **WHEN** hay 45 elementos disponibles y `porPagina=20`
- **THEN** `paginacion.total` es 45 y `paginacion.totalPaginas` es 3

