## 1. Modelos y servicio

- [x] 1.1 `core/api/reevaluacion.model.ts`: `EstimacionReevaluacion`, `ReevaluacionLoteRequest`, `ResultadoReevaluacion`
- [x] 1.2 `ReevaluacionService`: `estimar`/`solicitudEstimacion` (GET) y `ejecutar` (POST, cuerpo opcional); sin `ownerId`
- [x] 1.3 Specs del servicio: rutas del contrato, ejecución por defecto sin subconjunto, con `idsEntrevistas`

## 2. Pantalla de re-evaluación

- [x] 2.1 `ReevaluacionLote` (`/ideas/:id/entrevistas/reevaluacion`): estimación con `httpResource`; muestra afectadas, modelo, costo y tokens; aclaración normativa
- [x] 2.2 Ejecutar (POST) como acción explícita solo con afectadas y con BYOK; muestra el resultado y refresca la estimación; traduce `409`/`503`/`403`/`404`
- [x] 2.3 Specs: estimación con aclaración, sin afectadas no ejecuta, sin BYOK deshabilita, ejecutar muestra resultado, `409`, `403`

## 3. Rutas y navegación

- [x] 3.1 Ruta anidada `/ideas/:id/entrevistas/reevaluacion` con carga diferida (antes de `:idEntrevista`)
- [x] 3.2 Enlace a la re-evaluación desde el listado de entrevistas

## 4. Verificación

- [x] 4.1 `openspec validate --strict`; `npm run build` OK; `npm test --no-watch` verde
