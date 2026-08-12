## 1. Preparación

- [x] 1.1 Consultar la skill `angular-developer` (`get_best_practices` para la versión de Angular instalada) antes de escribir código: Signal Forms, `httpResource`, `linkedSignal`, plantillas y testing zoneless
- [x] 1.2 Releer en `../contrato-api/openapi.yaml` los endpoints de E2 (`/ideas/{id}/hipotesis`, `/ideas/{id}/hipotesis/{idHipotesis}`, `/ideas/{id}/umbrales`, `/ideas/{id}/umbrales/{kpi}`) y sus esquemas, para no deducir formas del backend

## 2. Modelos del contrato (`core/api/`)

- [x] 2.1 Crear `core/api/hipotesis.model.ts` con `TipoHipotesis`, `EstadoHipotesis`, `Hipotesis`, `CrearHipotesisRequest` y `ActualizarHipotesisRequest`, reflejando el OpenAPI (`ideaId` de solo lectura, nunca en las peticiones)
- [x] 2.2 Crear `core/api/umbral.model.ts` con los catálogos `Kpi`, `KpiGrupo` y `UnidadKpi` como arreglos `const` (para poder iterar el orden) y sus tipos derivados del arreglo, más `Umbral` y `ActualizarUmbralRequest`
- [x] 2.3 Verificar que ninguna interfaz de petición admite `ownerId`, `ideaId`, `grupo` ni `unidad` (campos derivados del path o de solo lectura)

## 3. Servicio y etiquetas de hipótesis

- [x] 3.1 Crear `features/ideas/hipotesis/hipotesis.service.ts` (`providedIn: 'root'`) con `solicitudLista(ideaId)` para `httpResource` y las mutaciones `crear`, `actualizar` y `eliminar`, todas con el `ideaId` interpolado en el path
- [x] 3.2 Crear el mapa local de etiquetas legibles de `TipoHipotesis` y `EstadoHipotesis` (patrón `ETIQUETA_ESTADO` de E1), con degradación a la clave cruda
- [x] 3.3 Escribir `hipotesis.service.spec.ts`: cada operación pega en la ruta y el método del contrato, y ninguna envía `ideaId` ni `ownerId` en el cuerpo

## 4. Pantalla de hipótesis (`ideas/:id/hipotesis`)

- [x] 4.1 Crear el componente de lista con `httpResource` sobre `GET /ideas/{id}/hipotesis`, `ChangeDetectionStrategy.OnPush`, y los estados cargando / vacío / error ramificados por `codigo` (`ACCESO_DENEGADO`, `RECURSO_NO_ENCONTRADO`, `ERROR_RED`) con reintento
- [x] 4.2 Renderizar cada hipótesis con su `tipo`, `enunciado` y `estado`, sin controles de paginación
- [x] 4.3 Crear el formulario Signal Forms de hipótesis (`tipo` del enum + `enunciado` requerido no vacío), reutilizado por el alta y por la edición inline; sin control de `estado` en el alta
- [x] 4.4 Implementar el alta: `POST`, bloqueo de envío mientras el formulario sea inválido, mapeo de `422 VALIDACION_FALLIDA` desde `detalles` campo a campo, y `reload()` del recurso al recibir `201`
- [x] 4.5 Implementar la edición inline: `PATCH` con `tipo`/`enunciado`, mismos mapeos de error, y `reload()` al completarse
- [x] 4.6 Implementar el marcado de estado como acción directa (`PATCH` con solo `estado`) para confirmada / refutada / pendiente, con textos que lo presenten como anotación del usuario y no como dictamen del sistema
- [x] 4.7 Implementar la eliminación con confirmación **en línea** de dos pasos (sin `window.confirm`): `DELETE`, y al `204` retirar la hipótesis de la lista
- [x] 4.8 Escribir los specs del componente (Vitest zoneless, Act–Wait–Assert con `await fixture.whenStable()`) cubriendo: listado, vacío, acceso denegado, alta válida e inválida, `422` campo a campo, marcado de estado, y eliminación confirmada vs. cancelada

## 5. Servicio y catálogo de umbrales

- [x] 5.1 Crear `features/ideas/umbrales/umbrales.service.ts` (`providedIn: 'root'`) con `solicitudLista(ideaId)` para `httpResource` y `fijar(ideaId, kpi, cuerpo)` para el `PUT` por KPI
- [x] 5.2 Crear el mapa local de etiquetas legibles de `Kpi` y `KpiGrupo` (nombre humano + línea de contexto) y el orden de los grupos según la sección 7 del SRS, con degradación a la clave cruda para KPIs no etiquetados
- [x] 5.3 Implementar las utilidades de unidad: formateo y parseo por `UnidadKpi`, con la conversión porcentaje ↔ tasa `0–1` redondeada explícitamente a la precisión mostrada
- [x] 5.4 Escribir `umbrales.service.spec.ts` y los tests de las utilidades de unidad, incluyendo la ida y vuelta de porcentaje (p. ej. `0.25 ↔ 25`) sin ruido de coma flotante

## 6. Pantalla de umbrales (`ideas/:id/umbrales`)

- [x] 6.1 Crear el componente con `httpResource` sobre `GET /ideas/{id}/umbrales`, estados cargando / error con reintento, y agrupamiento de las filas por el `grupo` **que viene en la respuesta** (nunca por una tabla cableada)
- [x] 6.2 Renderizar cada fila con los controles de `umbralGo` y `umbralKill` según la `unidad` de la respuesta; omitir por completo el control de kill cuando `umbralKill` es `null`
- [x] 6.3 Implementar el estado local por fila con `linkedSignal` derivado del valor del recurso (borrador, en curso, error), de modo que las filas no se pisen entre sí
- [x] 6.4 Implementar la validación local por fila (`umbralKill ≤ umbralGo`, `umbralGo` numérico y dentro del rango de su unidad) con el motivo visible en la fila y el guardado deshabilitado mientras sea inválida o no haya cambios
- [x] 6.5 Implementar el guardado fila por fila: `PUT` del KPI, reemplazo puntual de esa fila con el `Umbral` devuelto (sin recargar el resto), y mapeo de `422 VALIDACION_FALLIDA` (campo a campo en la fila) y `404 RECURSO_NO_ENCONTRADO` (KPI fuera del catálogo)
- [x] 6.6 Verificar que la vista no muestra valores de KPI calculados, comparaciones contra el umbral, veredictos, insignias de "personalizado" ni acción de restablecer al valor por defecto
- [x] 6.7 Escribir los specs del componente (Vitest zoneless) cubriendo: agrupamiento por `grupo`, KPI desconocido renderizado con su clave, fila sin zona kill, conversión de porcentaje al guardar, guardado deshabilitado sin cambios, `umbralKill > umbralGo` bloqueado, y un fallo de fila que no contamina las ediciones de las demás

## 7. Rutas y navegación

- [x] 7.1 Añadir en `app.routes.ts` las rutas hijas `ideas/:id/hipotesis` e `ideas/:id/umbrales` bajo el shell, con `loadComponent`
- [x] 7.2 Añadir en el detalle de la idea (`features/ideas/detalle/`) los enlaces a hipótesis y umbrales, junto a las acciones existentes de editar / archivar / desarchivar
- [x] 7.3 Actualizar `app.routes.spec.ts` y el spec del detalle para cubrir las rutas nuevas (carga diferida bajo el shell) y la presencia de ambos accesos

## 8. Cierre

- [x] 8.1 Ejecutar `npm test -- --no-watch` y dejar la suite completa en verde
- [x] 8.2 Ejecutar `npm run build` y confirmar que compila sin errores de tipos
- [x] 8.3 Revisar el diff contra las specs del change: cada requisito tiene su implementación y cada escenario su test
- [x] 8.4 Ejecutar `/opsx:verify` antes de archivar el change
