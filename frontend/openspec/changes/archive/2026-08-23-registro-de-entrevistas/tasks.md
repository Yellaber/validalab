## 1. Preparación

- [x] 1.1 Consultar la skill `angular-developer` antes de escribir código (Signal Forms con arreglos, `httpResource`, `@for` con `track`, testing zoneless)
- [x] 1.2 Releer en `../contrato-api/openapi.yaml` las rutas `/ideas/{id}/entrevistas[...]` y sus esquemas, para no deducir formas del backend
- [x] 1.3 Releer `features/guiones/preguntas.ts` para reaprovechar la **lección** del `track` (NG01904: recorrer el modelo plano y enlazar por índice), sin reutilizar el módulo

## 2. Modelos del contrato (`core/api/`)

- [x] 2.1 Crear `core/api/entrevista.model.ts` con `Entrevista`, `RespuestaEntrevista`, `Cita` y `EstadoScoring` como arreglo `const` con tipo derivado
- [x] 2.2 Declarar `ScoreEntrevista`, `SenalesEstructuradas` y `AjusteScore` fieles al contrato, documentando que **solo se leen en el change de scoring**
- [x] 2.3 Añadir `CrearEntrevistaRequest`, `CrearCitaRequest` y `ActualizarEntrevistaRequest`, verificando que ninguno admite `ideaId`, `ownerId` ni `score`, y que el de actualización **no** admite `contactoId` ni `guionId`
- [x] 2.4 Confirmar que el listado reutiliza `RespuestaPaginada<Entrevista>`, sin duplicar el sobre

## 3. Servicio de entrevistas

- [x] 3.1 Crear `features/ideas/entrevistas/entrevistas.service.ts` con `solicitudListado(ideaId, params)` y `solicitudDetalle(ideaId, idEntrevista)`, más `crear`, `listar`, `consultar`, `editar` y `eliminar`
- [x] 3.2 **No** añadir `puntuar` ni `ajustarScore`: llegan con la vista que los usa (frontera del change)
- [x] 3.3 Escribir `entrevistas.service.spec.ts`: cada operación pega en su ruta y método, el listado propaga `pagina`/`porPagina`/`contactoId`/`estadoScoring`, y ningún cuerpo lleva `ideaId`, `ownerId` ni `score`

## 4. Editor de citas

- [x] 4.1 Crear `features/ideas/entrevistas/citas.ts` con `FilaCita` (clave local + `texto` + `contexto`, **sin `orden`** ni `id`), `filaNueva` y `aRequests` que omite las filas sin texto
- [x] 4.2 Crear el componente del editor: `@for` sobre el modelo plano trackeado por la clave local y campo enlazado por índice; añadir y eliminar cualquier fila, incluida la última
- [x] 4.3 Escribir `citas.spec.ts`: `aRequests` omite las vacías, conserva `contexto` solo cuando existe, y ninguna salida contiene la clave local ni un `id`

## 5. Resolución de nombres

- [x] 5.1 Crear un helper de la feature que cargue contactos y guiones de la idea (`porPagina` generoso) y exponga dos mapas `id → nombre` como signals
- [x] 5.2 Degradar a un texto neutro cuando un identificador no resuelva; **nunca** renderizar el UUID
- [x] 5.3 Escribir su spec: resolución correcta, y degradación sin fuga del identificador

## 6. Listado (`ideas/:id/entrevistas`)

- [x] 6.1 Crear el componente con `httpResource` reactivo a `pagina`/`porPagina`/`filtroContacto`/`filtroEstadoScoring`, con `ChangeDetectionStrategy.OnPush`
- [x] 6.2 Renderizar cada entrevista con el **nombre** de su contacto y de su guión, su fecha y su `estadoScoring`
- [x] 6.3 Implementar los dos filtros del contrato (ambos combinables) y la paginación, volviendo a la primera página al filtrar
- [x] 6.4 Implementar los estados cargando / vacío / error ramificando por `codigo`, con reintento
- [x] 6.5 Escribir los specs: listado con nombres resueltos, nombre no resoluble, cada filtro y ambos a la vez, paginación, vacío y error

## 7. Alta de entrevista (`ideas/:id/entrevistas/nueva`)

- [x] 7.1 Crear el componente con los selectores de contacto y guión, poblados vía `ContactosService` y `GuionesService`
- [x] 7.2 Excluir del selector de contactos los estados `entrevistado` y `descartado`; con ninguno disponible, explicarlo y enlazar al CRM en vez de mostrar un desplegable vacío
- [x] 7.3 Generar una entrada de respuesta por cada pregunta del guión elegido, en su orden y junto al texto de la pregunta, con `preguntaId` como `track`
- [x] 7.4 Implementar la confirmación en línea al cambiar de guión **solo si hay respuestas con texto**; sin nada escrito, cambiar de inmediato
- [x] 7.5 Integrar el editor de citas y construir el cuerpo con `contactoId`, `guionId`, `respuestas` y `citas`, sin `ideaId`, `ownerId` ni `score`
- [x] 7.6 Implementar el mapeo de errores: `422 ENTREVISTA_SIN_VINCULO`, `409 CONFLICTO` y `422 VALIDACION_FALLIDA` campo a campo; navegar al detalle tras el `201`
- [x] 7.7 Escribir los specs: campos derivados del guión, alta válida, bloqueo sin lo obligatorio, exclusión de contactos, sin contactos entrevistables, cambio de guión con y sin respuestas, cancelación, y los tres errores

## 8. Detalle (`ideas/:id/entrevistas/:idEntrevista`)

- [x] 8.1 Crear el componente con `httpResource` sobre el `GET` individual, encadenando la carga de su guión para poder mostrar los textos de las preguntas
- [x] 8.2 Renderizar contacto, guión, cada respuesta junto al texto de su pregunta en el orden del guión, las citas y el `estadoScoring` como etiqueta
- [x] 8.3 **No** renderizar el bloque `score` ni el `ajuste`, ni ofrecer acciones de scoring: frontera con el change siguiente
- [x] 8.4 Implementar la eliminación con confirmación en línea de dos pasos y vuelta al listado tras el `204`
- [x] 8.5 Implementar el mapeo de errores por `codigo`: `403` sin revelar dato alguno, `404` como entrevista inexistente
- [x] 8.6 Escribir los specs: respuestas junto a sus preguntas, citas, borrado confirmado y cancelado, `404`, `403` sin fuga, y ausencia del bloque de score

## 9. Edición (`ideas/:id/entrevistas/:idEntrevista/editar`)

- [x] 9.1 Crear el componente **aparte del alta**, cargando la entrevista y su guión, sin selectores de contacto ni de guión
- [x] 9.2 Implementar la advertencia de invalidación del score, mostrada **solo si alguna respuesta cambió** respecto a la cargada
- [x] 9.3 Enviar el `PATCH` con `respuestas` y `citas`, y navegar al detalle tras el `200`
- [x] 9.4 Escribir los specs: ausencia de selectores, aviso al cambiar una respuesta, ausencia de aviso al cambiar solo citas, y `PATCH` correcto

## 10. Rutas y navegación

- [x] 10.1 Añadir en `app.routes.ts` las cuatro rutas hijas bajo el shell con `loadComponent`, declarando `nueva` **antes** que `:idEntrevista`
- [x] 10.2 Añadir en el detalle de la idea el acceso a las entrevistas, junto a hipótesis, umbrales y contactos
- [x] 10.3 Actualizar `app.routes.spec.ts` y el spec del detalle de idea; ampliar `shell.spec.ts` para cubrir que `Ideas` sigue activa en una ruta de entrevistas

## 11. Cierre

- [x] 11.1 Ejecutar `npm test -- --no-watch` y dejar la suite completa en verde
- [x] 11.2 Ejecutar `npm run build` y confirmar que compila sin errores ni avisos de presupuesto
- [x] 11.3 Pasar Prettier **solo sobre los archivos tocados** (no globs amplios: en E4a un glob de más reformateó 22 ficheros ajenos)
- [x] 11.4 Revisar el diff contra las specs del change: cada requisito con su implementación y cada escenario con su test
- [x] 11.5 Verificación ejecutada: 14/14 requisitos implementados, 52 escenarios cubiertos por 64 tests de la feature (288 en total), build limpio y Prettier acotado a los ficheros del change
