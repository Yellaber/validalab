## 1. Preparación

- [x] 1.1 Consultar la skill `angular-developer` antes de escribir código (`httpResource`, signals, testing zoneless)
- [x] 1.2 Releer en `../contrato-api/openapi.yaml` el tag `kpis` completo y sus esquemas
- [x] 1.3 Releer `features/ideas/umbrales/catalogo-kpi.ts` y `unidad-kpi.ts` para reutilizarlos **sin duplicar** el formateo

## 2. Modelos del contrato (`core/api/`)

- [x] 2.1 Crear `core/api/kpi.model.ts` con `TableroIdea`, `KpiCalculado`, `ResumenTablero` y `AlertaKpi`
- [x] 2.2 Declarar `ZonaKpi` y `TipoAlerta` como arreglos `const` con tipo derivado, para iterarlos con orden estable
- [x] 2.3 Importar `Kpi`, `KpiGrupo` y `UnidadKpi` de `umbral.model.ts` en vez de redeclararlos
- [x] 2.4 Añadir `ActualizarAlertaRequest` limitado a `leida`; confirmar que el listado reutiliza `RespuestaPaginada<AlertaKpi>`

## 3. Servicio

- [x] 3.1 Crear `features/ideas/tablero/tablero.service.ts` con `solicitudTablero(ideaId)` y `solicitudAlertas(ideaId, params)` para `httpResource`, más `marcarLeida`
- [x] 3.2 Escribir su spec: cada operación pega en su ruta y método, el listado propaga `pagina`/`porPagina`/`leida`, y el cuerpo del marcado lleva **solo** `leida`

## 4. Tablero (`ideas/:id/tablero`)

- [x] 4.1 Crear el componente con `httpResource` sobre `GET /ideas/{id}/kpis`, con `ChangeDetectionStrategy.OnPush`
- [x] 4.2 Agrupar los KPIs por `grupo` usando `ORDEN_GRUPOS`, con el nombre y el contexto de cada grupo, degradando a la clave cruda lo que no esté en el catálogo
- [x] 4.3 Mapear `zona → clase CSS` **sin recalcular** la zona a partir del valor y los umbrales
- [x] 4.4 Formatear valor y umbrales con `unidad-kpi.ts`, sin duplicar la lógica de precisión
- [x] 4.5 Presentar `sin_datos` como falta de evidencia, con tratamiento neutro y sin mostrar un cero
- [x] 4.6 Mostrar `numerador`/`denominador` cuando vengan, y omitirlos cuando no
- [x] 4.7 Indicar que un KPI con `umbralKill` nulo no tiene zona kill, sin inventar umbral
- [x] 4.8 Renderizar el `resumen` del servidor sin recalcular conteos
- [x] 4.9 Implementar los estados cargando / error ramificando por `codigo`, con reintento; `403` sin revelar datos
- [x] 4.10 Escribir los specs: agrupación y orden, KPI fuera de catálogo, zona respetada, `sin_datos` vs cero, fracción presente y ausente, KPI sin zona kill, resumen, error y `403`

## 5. Alertas (`ideas/:id/alertas`)

- [x] 5.1 Crear el componente con `httpResource` reactivo a `pagina`/`porPagina`/`filtroLeida`
- [x] 5.2 Renderizar cada alerta con su KPI, el sentido del cruce, el valor y el umbral, formateados con la unidad del KPI
- [x] 5.3 Implementar el filtro por `leida` volviendo a la primera página, y la paginación
- [x] 5.4 Implementar `marcarLeida` con `PATCH { leida: true }` y recarga posterior, sin estado optimista
- [x] 5.5 No ofrecer crear ni eliminar alertas
- [x] 5.6 Implementar los estados cargando / vacío / error, con reintento
- [x] 5.7 Escribir los specs: listado con formateo por unidad, filtro, marcado con cuerpo mínimo y recarga, ausencia de crear/eliminar, vacío y error

## 6. Rutas y navegación

- [x] 6.1 Añadir en `app.routes.ts` las rutas hijas `ideas/:id/tablero` e `ideas/:id/alertas` bajo el shell, con `loadComponent`
- [x] 6.2 Añadir en el detalle de la idea el acceso al tablero, junto a los ya existentes
- [x] 6.3 Actualizar `app.routes.spec.ts` y el spec del detalle de idea; ampliar `shell.spec.ts` para cubrir que `Ideas` sigue activa en el tablero

## 7. Cierre

- [x] 7.1 Verificar que el tablero **no** contiene aritmética de zonas ni de conteos del resumen
- [x] 7.2 Ejecutar `npm test -- --no-watch` y dejar la suite completa en verde
- [x] 7.3 Ejecutar `npm run build` y confirmar que compila sin errores ni **avisos de presupuesto** (vigilar el CSS de la feature, como pasó en E4b-2)
- [x] 7.4 Pasar Prettier **solo sobre los archivos tocados**, sin globs amplios
- [x] 7.5 Revisar el diff contra las specs del change: cada requisito con su implementación y cada escenario con su test
- [x] 7.6 Verificación ejecutada: 9 requisitos nuevos y 3 modificados, 39 escenarios cubiertos por 29 tests de la feature (351 en total); comprobado que el tablero no contiene aritmética de zonas ni de conteos
