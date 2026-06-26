## 1. Crear el contrato OpenAPI único

- [x] 1.1 Crear el directorio `contrato-api/` en la raíz del monorepo
- [x] 1.2 Crear `contrato-api/openapi.yaml` como documento único (info básica, `servers`, sin endpoints todavía)
- [x] 1.3 Declarar los 7 `tags` de dominio en el OpenAPI: `usuarios`, `ideas`, `contactos`, `entrevistas`, `kpis`, `agente`, `proveedores`
- [x] 1.4 Verificar que el OpenAPI es válido (lint con un validador OpenAPI)

## 2. Definir las convenciones transversales en el contrato

- [x] 2.1 Definir el `securityScheme` de autenticación en `components.securitySchemes` y aplicarlo globalmente
- [x] 2.2 Definir el esquema estándar de error en `components.schemas` con su catálogo de códigos de error (detalle extenso vive aquí, no en `CLAUDE.md`)
- [x] 2.3 Definir los parámetros reutilizables de paginación en `components.parameters`
- [x] 2.4 Documentar la regla de aislamiento multi-tenant por `owner_id` y la convención de nombres (en `description`/comentarios del OpenAPI)

## 3. Reestructurar el CLAUDE.md de la raíz

- [x] 3.1 Añadir el bloque "Contrato de API" con el índice navegable (enlace único a `contrato-api/openapi.yaml`)
- [x] 3.2 Añadir el resumen normativo de cada convención transversal (autenticación, `owner_id`, formato de error, paginación, nombres) en pocas líneas cada una
- [x] 3.3 Documentar la regla anti-bloat: el detalle endpoint-por-endpoint y los catálogos extensos viven en el OpenAPI, no en `CLAUDE.md`
- [x] 3.4 Verificar que `CLAUDE.md` no contiene detalle de endpoints ni el catálogo completo de errores (solo índice + resúmenes)

## 4. Alinear los CLAUDE.md de los paquetes

- [x] 4.1 Actualizar `frontend/CLAUDE.md` para referenciar el contrato canónico y el `CLAUDE.md` de la raíz como fuente de verdad
- [x] 4.2 Actualizar `backend/CLAUDE.md` para referenciar el contrato canónico y el `CLAUDE.md` de la raíz como fuente de verdad
- [x] 4.3 Verificar que ningún paquete duplica el contrato ni mantiene una descripción de API propia

## 5. Verificación final

- [x] 5.1 Confirmar que el contrato es un único documento OpenAPI (sin ficheros por módulo)
- [x] 5.2 Confirmar que desde `CLAUDE.md` se alcanza todo el detalle del contrato siguiendo el índice (consulta integral)
- [x] 5.3 Confirmar que frontend y backend pueden desarrollar contra el contrato sin referenciar el código del otro
