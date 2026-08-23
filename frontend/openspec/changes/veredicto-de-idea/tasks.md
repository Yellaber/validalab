## 1. Modelos y servicio

- [x] 1.1 `core/api/veredicto.model.ts`: `Veredicto`, `TipoVeredicto`, `EstadoVeredicto`, `JustificacionKpi`, `VerificacionVeredicto`, `VerificarVeredictoRequest`; reutiliza `Kpi` y `KpiCalculado`
- [x] 1.2 `VeredictoService`: `emitir` (POST sin cuerpo), `listar`/`solicitudHistorial` (paginado), `solicitudDetalle`, `verificar`; nunca envía `ownerId` ni el bloque del agente
- [x] 1.3 Specs del servicio: rutas/métodos del contrato, emitir sin cuerpo, verificar aprobar/anular, sin `ownerId`

## 2. Historial y emisión

- [x] 2.1 `VeredictosIdea` (`ideas/:id/veredictos`): historial paginado con `httpResource`, estado vacío/error, y acción de emitir que navega al veredicto nuevo
- [x] 2.2 Traducir `409`/`502`/`503` de la emisión a avisos claros sin romper la vista
- [x] 2.3 Specs: lista el historial, estado vacío, emitir navega, `409` sin BYOK, `403` no revela

## 3. Detalle y verificación consultiva

- [x] 3.1 `DetalleVeredicto` (`ideas/:id/veredictos/:idVeredicto`): juicio, razonamiento por KPI (nombre legible del catálogo), recomendaciones, proveedor/modelo, snapshot congelado
- [x] 3.2 Verificación (solo si `pendiente`): aprobar (POST) y anular con nota (Signal Forms, validación local); reflejar el nuevo estado y la verificación; traducir `409`/`422`
- [x] 3.3 Specs: muestra el detalle, aprobar hace POST, anular exige nota, verificado no ofrece acciones

## 4. Rutas y navegación

- [x] 4.1 Dos rutas hijas con carga diferida en `app.routes.ts` (historial antes que `:idVeredicto`)
- [x] 4.2 Enlace al veredicto desde el detalle de idea; el resaltado de `Ideas` cubre las rutas de veredicto por prefijo

## 5. Verificación

- [x] 5.1 `openspec validate --strict`; `npm run build` OK; `npm test --no-watch` verde
