## 1. Modelos y servicio

- [x] 1.1 `core/api/costo.model.ts`: `CostoUsuario`, `CostoIdea`, `DesgloseCostoTarea`, `CostoIdeaResumen`, `PrecioModelo`, `Moneda`, `TareaCosto`
- [x] 1.2 `CostoService`: `costoDelUsuario`/`solicitudCostoUsuario`, `costoDeIdea`/`solicitudCostoIdea`, `listarPrecios`/`solicitudPrecios`; solo lectura
- [x] 1.3 Specs del servicio: las tres rutas del contrato + los builders de solicitud

## 2. Costo del usuario

- [x] 2.1 `CostoUsuarioComponent` (`/costo`): total, desglose por idea (enlazado), tabla de precios; estados de carga/error con reintento
- [x] 2.2 Specs: total + desglose + aclaración, tabla de precios, enlace de facturación, error

## 3. Costo por idea

- [x] 3.1 `CostoIdeaComponent` (`/ideas/:id/costo`): total y desglose por tarea (nombre legible) con llamadas/tokens/costo; traduce 403/404
- [x] 3.2 Specs: total + desglose por tarea + aclaración, 403 no revela, 404 inexistente

## 4. Regla normativa, rutas y navegación

- [x] 4.1 Ambas vistas muestran la `aclaracion` (estimado, no saldo) y el enlace `urlFacturacion`
- [x] 4.2 Rutas diferidas `/costo` y `/ideas/:id/costo`; cuarto dominio en el shell (**Costo**); enlace al costo desde el detalle de idea

## 5. Verificación

- [x] 5.1 `openspec validate --strict`; `npm run build` OK; `npm test --no-watch` verde
