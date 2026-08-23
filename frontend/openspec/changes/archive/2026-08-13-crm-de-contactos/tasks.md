## 1. Preparación

- [x] 1.1 Consultar la skill `angular-developer` antes de escribir código (Signal Forms, `httpResource`, `linkedSignal`, testing zoneless)
- [x] 1.2 Releer en `../contrato-api/openapi.yaml` el tag `contactos` completo y sus esquemas, para no deducir formas del backend

## 2. Modelos del contrato (`core/api/`)

- [x] 2.1 Crear `core/api/contacto.model.ts` con `Contacto` y los catálogos `EstadoOutreach`, `CanalContacto` y `OrigenContacto` como arreglos `const` con tipos derivados
- [x] 2.2 Añadir `CrearContactoRequest`, `ActualizarContactoRequest`, `TransicionEstadoRequest` y `RegistrarToqueRequest`, verificando que ninguno admite `ideaId`, `ownerId`, `estado` ni fechas de toque
- [x] 2.3 Confirmar que el listado reutiliza `RespuestaPaginada<Contacto>` de `core/api/paginacion.model.ts`, sin duplicar el sobre

## 3. Servicio y catálogo de contactos

- [x] 3.1 Crear `features/ideas/contactos/contactos.service.ts` con `solicitudListado(ideaId, params)` y `solicitudDetalle(ideaId, idContacto)` para `httpResource`, más `crear`, `listar`, `consultar`, `editar`, `eliminar`, `transicionar` y `registrarToque`
- [x] 3.2 Crear `features/ideas/contactos/embudo.ts` con las etiquetas legibles de los tres catálogos (degradando a la clave cruda), la constante `ESTADOS_FILTRO` con los seis estados, y `destinosAlcanzables(estado)` que excluye `entrevistado` y devuelve el siguiente del embudo más `descartado`
- [x] 3.3 Escribir `contactos.service.spec.ts`: cada operación pega en su ruta y método, el listado propaga `pagina`/`porPagina`/`estado`, y ningún cuerpo lleva `ideaId`, `ownerId`, `estado` ni fechas de toque
- [x] 3.4 Escribir `embudo.spec.ts`: `destinosAlcanzables` nunca incluye `entrevistado`, ofrece `descartado` desde los no terminales y no ofrece nada desde los terminales

## 4. Lista del embudo (`ideas/:id/contactos`)

- [x] 4.1 Crear el componente con `httpResource` reactivo a los signals de `pagina`/`porPagina`/`filtroEstado`, con `ChangeDetectionStrategy.OnPush`
- [x] 4.2 Renderizar cada contacto con `nombre`, `perfil`, `canal`, su estado del embudo y su número de toques derivado de las dos fechas
- [x] 4.3 Implementar el filtro por estado con los seis del catálogo (incluido `entrevistado`) y los controles de paginación derivados de `paginacion`
- [x] 4.4 Implementar los estados cargando / vacío / error, ramificando por `codigo`, con reintento; ante `ACCESO_DENEGADO` no renderizar ningún dato de contacto
- [x] 4.5 Escribir los specs del componente: listado, filtro, paginación, vacío, error con reintento y el caso de acceso denegado sin fuga de datos

## 5. Formulario de contacto (alta y edición)

- [x] 5.1 Crear el formulario Signal Forms con `nombre` requerido y `perfil`/`enlace`/`notas` opcionales, más los selects de `canal` y `origen`
- [x] 5.2 Implementar el alta (`POST`) con bloqueo mientras sea inválido, mapeo de `422` campo a campo desde `detalles` y navegación al contacto creado
- [x] 5.3 Implementar la edición (`PATCH`) inicializando el formulario con el contacto cargado, sin control de `estado` ni de fechas de toque
- [x] 5.4 Implementar el selector de `referidoPorId`: se puebla solo cuando `origen` es `referido`, lista contactos de la misma idea y excluye el contacto en edición
- [x] 5.5 Omitir del cuerpo los opcionales vacíos, y `referidoPorId` cuando el origen no es `referido`
- [x] 5.6 Escribir los specs del formulario: alta válida e inválida, `422` campo a campo, ausencia de controles de estado/toques, y el comportamiento del selector de referido en ambos orígenes

## 6. Detalle del contacto (`ideas/:id/contactos/:idContacto`)

- [x] 6.1 Crear el componente con `httpResource` sobre el `GET` individual, mostrando contenido, referidor cuando aplique, estado del embudo e historial de toques
- [x] 6.2 Implementar las acciones de transición ofreciendo solo `destinosAlcanzables`, con el texto que explica por qué `entrevistado` no está entre ellas
- [x] 6.3 Implementar el registro de toque con `fecha` opcional omitida cuando está vacía, y retirar la acción cuando ya hay dos toques explicando que es el límite del método
- [x] 6.4 Implementar la eliminación con confirmación en línea de dos pasos (sin `window.confirm`) y vuelta al listado tras el `204`
- [x] 6.5 Implementar el mapeo de errores **por operación**: el `409` de transición y el de toques dan mensajes distintos; `403` no revela dato alguno; `404` es contacto inexistente
- [x] 6.6 Escribir los specs del detalle: contenido y toques, transición exitosa, `entrevistado` ausente de los destinos, `409` de transición vs. `409` de toque con mensajes distintos, límite de toques sin acción ofrecida, borrado confirmado vs. cancelado, y `403` sin fuga de datos

## 7. Rutas y navegación

- [x] 7.1 Añadir en `app.routes.ts` las rutas hijas `ideas/:id/contactos` e `ideas/:id/contactos/:idContacto` bajo el shell, con `loadComponent`
- [x] 7.2 Añadir en el detalle de la idea el acceso a contactos, junto a los de hipótesis y umbrales
- [x] 7.3 Actualizar `app.routes.spec.ts` y el spec del detalle de idea para cubrir las rutas nuevas y el acceso añadido

## 8. Cierre

- [x] 8.1 Ejecutar `npm test -- --no-watch` y dejar la suite completa en verde
- [x] 8.2 Ejecutar `npm run build` y confirmar que compila sin errores ni avisos de presupuesto (vigilar el tamaño de los CSS por sub-feature)
- [x] 8.3 Pasar Prettier sobre los archivos tocados y revisar que no haya churn en archivos ajenos al change
- [x] 8.4 Revisar el diff contra las specs del change: cada requisito con su implementación y cada escenario con su test
- [x] 8.5 Ejecutar `/opsx:verify` antes de preparar el PR
