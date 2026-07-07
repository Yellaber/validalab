## 1. Tipos y persistencia

- [x] 1.1 Tipos Zod: `proveedorIdSchema` (`anthropic`|`openai`|`google`), `modeloIaSchema` (`{id, nombre, descripcion?}`), `proveedorIaSchema` (`{id, nombre, modelos[]}`); constante `PROVEEDORES` (id → nombre visible)
- [x] 1.2 Entidad `ModeloIA` (TypeORM, tabla `modelos_ia`): `id`, `proveedor` (indexado), `modeloId`, `nombre`, `descripcion?`, `orden`
- [x] 1.3 Migración de la tabla `modelos_ia` con el **seed** inicial (Anthropic/OpenAI/Google); verificado `run`/`revert`/`run` contra PostgreSQL (Docker)

## 2. Catálogo (catalogo-de-proveedores)

- [x] 2.1 DTO de respuesta `ProveedorIaDto` (arreglo de `ProveedorIA`)
- [x] 2.2 `CatalogoService.listar()`: carga los modelos (orden `proveedor`,`orden`), los agrupa por proveedor y proyecta un `ProveedorIA` por cada `ProveedorId` de `PROVEEDORES`
- [x] 2.3 `GET /proveedores` (protegido, `@ApiBearerAuth`) → 200 con el catálogo; 401 sin token
- [x] 2.4 Tests: agrupa por proveedor; incluye los 3 proveedores (uno sin modelos → `modelos: []`); orden dentro del proveedor

## 3. Cableado y verificación final

- [x] 3.1 Crear `ProveedoresModule` (`forFeature([ModeloIA])`) e importarlo en `AppModule`
- [x] 3.2 Verificado contra la BD (Docker): `GET /proveedores` (200 con los 3 proveedores y sus modelos; 401 sin token)
- [x] 3.3 `npm run lint` (check) y `npm test` en verde (156 tests)
- [x] 3.4 Verificar el change con la skill de OpenSpec antes de archivar (sin issues críticos)
