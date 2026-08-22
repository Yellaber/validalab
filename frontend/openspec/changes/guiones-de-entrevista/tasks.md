## 1. Preparación

- [x] 1.1 Consultar la skill `angular-developer` antes de escribir código (Signal Forms, `httpResource`, `@for` con `track`, testing zoneless)
- [x] 1.2 Releer en `../contrato-api/openapi.yaml` las rutas `/guiones` y `/guiones/{idGuion}` del tag `entrevistas` y sus esquemas, para no deducir formas del backend

## 2. Modelos del contrato (`core/api/`)

- [x] 2.1 Crear `core/api/guion.model.ts` con `Guion`, `Pregunta` (con `id`, `orden`, `texto`) y `PreguntaRequest` (solo `orden` y `texto`, **sin `id`**)
- [x] 2.2 Añadir `CrearGuionRequest` y `ActualizarGuionRequest`, verificando que ninguno admite `ownerId` y que ambos declaran `preguntas` con al menos una entrada
- [x] 2.3 Confirmar que el listado reutiliza `RespuestaPaginada<Guion>` de `core/api/paginacion.model.ts`, sin duplicar el sobre

## 3. Servicio de guiones

- [x] 3.1 Crear `features/guiones/guiones.service.ts` con base `${environment.baseUrl}/guiones` (**sin `ideaId`**), `solicitudListado(params)` y `solicitudDetalle(idGuion)` para `httpResource`, más `crear`, `listar`, `consultar`, `editar` y `eliminar`
- [x] 3.2 Escribir `guiones.service.spec.ts`: cada operación pega en su ruta y método, el listado propaga `pagina`/`porPagina`, y ningún cuerpo lleva `ownerId`

## 4. Editor de preguntas ordenadas

- [x] 4.1 Crear `features/guiones/preguntas.ts` con el tipo local `FilaPregunta` (clave local del cliente + `texto`, **sin campo `id`** ni `orden`) y las operaciones puras `filaNueva`, `moverFila` y `aRequests(filas)`, que asigna `orden` contiguo base 1 por posición
- [x] 4.2 Integrar las preguntas en el modelo de Signal Forms con `applyEach`, recorridas con `@for` trackeadas por la clave local, y controles de subir/bajar operables por teclado y deshabilitados en los extremos
- [x] 4.3 Retirar la acción de eliminar cuando solo queda una pregunta, con el texto que explica que un guión necesita al menos una
- [x] 4.4 Escribir `preguntas.spec.ts`: `aRequests` numera 1..n sin huecos tras eliminar e intercalar, `moverFila` respeta los extremos, y ninguna salida contiene la clave local ni un `id`
- [x] 4.5 Escribir los specs del editor dentro del formulario: añadir, mover arriba/abajo, controles deshabilitados en extremos, y ausencia de la acción de eliminar con una sola pregunta

## 5. Listado de guiones (`/guiones`)

- [x] 5.1 Crear el componente con `httpResource` reactivo a los signals de `pagina`/`porPagina`, con `ChangeDetectionStrategy.OnPush`
- [x] 5.2 Renderizar cada guión con `nombre`, `descripcion` cuando exista y el número de preguntas derivado de `preguntas.length`
- [x] 5.3 Implementar los controles de paginación derivados del bloque `paginacion`, sin filtro ni búsqueda (el contrato no los expone aquí)
- [x] 5.4 Implementar los estados cargando / vacío / error, ramificando por `codigo`, con reintento
- [x] 5.5 Escribir los specs del componente: listado con recuento de preguntas, paginación, vacío y error con reintento

## 6. Formulario de guión (alta y edición)

- [x] 6.1 Crear el formulario Signal Forms con el modelo `{ nombre, descripcion, preguntas }`, `required` en `nombre` y `applyEach` con validación de texto no vacío en cada pregunta
- [x] 6.2 Bloquear el guardado con `formulario().valid()`, que ya cubre el nombre y todas las filas
- [x] 6.3 Implementar el alta (`POST`) arrancando con una fila de pregunta vacía, omitiendo `descripcion` cuando esté en blanco, y navegando al detalle del guión creado
- [x] 6.4 Implementar la edición (`PATCH`) inicializando el formulario y el editor con el guión cargado, y enviando **siempre el conjunto ordenado completo** de preguntas
- [x] 6.5 Implementar el mapeo del `422` campo a campo desde `detalles`, señalando la fila concreta cuando el error apunta a una pregunta
- [x] 6.6 Escribir los specs del formulario: alta válida e inválida, `descripcion` vacía omitida, edición de una sola pregunta que envía las tres, `422` campo a campo incluida una fila, y ausencia de `ownerId` y de la clave local en todo cuerpo

## 7. Detalle del guión (`/guiones/:idGuion`)

- [x] 7.1 Crear el componente con `httpResource` sobre el `GET` individual, mostrando `nombre`, `descripcion` y las preguntas por `orden` ascendente
- [x] 7.2 Implementar la eliminación con confirmación en línea de dos pasos (sin `window.confirm`) y vuelta al listado tras el `204`
- [x] 7.3 Implementar el mapeo de errores por `codigo`: `403` sin revelar dato alguno del guión, `404` como guión inexistente con vuelta al listado
- [x] 7.4 Escribir los specs del detalle: contenido y orden de preguntas, borrado confirmado vs. cancelado, `404`, y `403` sin fuga de datos

## 8. Rutas y navegación del shell

- [x] 8.1 Añadir en `app.routes.ts` las rutas hijas `guiones`, `guiones/nuevo`, `guiones/:idGuion` y `guiones/:idGuion/editar` bajo el shell, con `loadComponent` y declarando `nuevo` **antes** que `:idGuion`
- [x] 8.2 Añadir en `shell.html` la navegación entre `Ideas` y `Guiones` con `routerLinkActive`, **sin** `exact: true`, para que `Ideas` siga activa en las rutas anidadas
- [x] 8.3 Ampliar `shell.spec.ts` (sin reescribirlo) cubriendo el destino activo en cada dominio y que el resaltado de `Ideas` sobrevive a una ruta anidada
- [x] 8.4 Actualizar `app.routes.spec.ts` para cubrir las cuatro rutas nuevas y que `guiones/nuevo` no se resuelve como identificador

## 9. Cierre

- [x] 9.1 Ejecutar `npm test -- --no-watch` y dejar la suite completa en verde
- [x] 9.2 Ejecutar `npm run build` y confirmar que compila sin errores ni avisos de presupuesto
- [x] 9.3 Pasar Prettier sobre los archivos tocados y revisar que no haya churn en archivos ajenos al change
- [x] 9.4 Revisar el diff contra las specs del change: cada requisito con su implementación y cada escenario con su test
- [x] 9.5 Ejecutar `/opsx:verify` antes de preparar el PR
