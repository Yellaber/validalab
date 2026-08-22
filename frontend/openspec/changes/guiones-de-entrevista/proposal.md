## Why

E4 registra entrevistas de descubrimiento, pero `CrearEntrevistaRequest` exige un `guionId` propio: **sin guiones no se puede registrar ni una sola entrevista**. El guión es la precondición dura de la épica, y por eso se construye primero y por separado.

No es un detalle de plomería. El guión es **el instrumento del método**: un conjunto ordenado de preguntas que se reutiliza **entre ideas** (RF-08, HU-11), de modo que dos ideas distintas puedan interrogarse con la misma vara. Esa reutilización es lo que hace comparables las entrevistas y, aguas abajo, lo que da sentido a los KPIs de calidad del descubrimiento (E5): si cada conversación preguntara otra cosa, el score de una entrevista no significaría nada frente al de otra. Las `respuestas` de una entrevista apuntan a un `preguntaId` del guión, así que el guión es además el esqueleto sobre el que se captura la evidencia.

Es también **el primer recurso de dominio que no cuelga de una idea**: vive en `/guiones`, es propiedad del usuario y no de una idea. Hasta ahora todo el cliente colgaba del portafolio, así que el shell gana por primera vez una navegación real entre dos dominios de primer nivel.

Se construye contra `../contrato-api/openapi.yaml` (tag `entrevistas`, rutas `/guiones`), sin inspeccionar ni depender del código de `backend/`.

## What Changes

- **Modelos del contrato** (`core/api/guion.model.ts`): `Guion`, `Pregunta`, `PreguntaRequest`, `CrearGuionRequest` y `ActualizarGuionRequest`. Reutiliza el sobre `RespuestaPaginada<T>` ya existente.
- **Servicio de recurso** (`features/guiones/`): `GuionesService` con las cinco operaciones de la ruta (`crear`, `listar` paginado, `consultar`, `editar`, `eliminar`), ninguna enviando `ownerId` en el cuerpo.
- **Listado de guiones** (`/guiones`): página que consume `GET /guiones` con `pagina`/`porPagina`, mostrando de cada guión su `nombre`, su `descripcion` y cuántas preguntas tiene. Estados de carga, vacío y error con el patrón del portafolio (E1). El contrato **no ofrece filtro** en esta colección: solo paginación.
- **Alta de guión** (Signal Forms): `nombre` obligatorio, `descripcion` opcional y **al menos una pregunta**, que el contrato exige (`minItems: 1`).
- **Editor de preguntas ordenadas**: el corazón del change. Añadir, editar el texto, eliminar y **reordenar** preguntas, con el `orden` (base 1, contiguo) **derivado de la posición en la lista** y nunca tecleado por el usuario. El `PATCH` **reemplaza el conjunto ordenado completo**, así que el cliente envía siempre todas las preguntas, no un delta.
- **Detalle de guión** (`/guiones/:idGuion`): consume el `GET` individual y muestra el nombre, la descripción y las preguntas en su orden, más las acciones de editar y eliminar.
- **Eliminación con confirmación en línea**, sin `window.confirm`, siguiendo el patrón ya establecido en hipótesis y contactos.
- **Rutas y navegación de primer nivel**: `guiones`, `guiones/nuevo`, `guiones/:idGuion` y `guiones/:idGuion/editar` como rutas hijas protegidas del shell con carga diferida; el shell suma una **navegación entre `Ideas` y `Guiones`**, que hasta ahora no necesitaba porque solo había un dominio.

**Fuera de alcance**: el registro de entrevistas y su scoring por IA (el segundo change de E4), que es quien consume `guionId` y `preguntaId`; los KPIs de calidad del descubrimiento (E5); y cualquier noción de plantillas predefinidas o biblioteca compartida de guiones, que el contrato no modela.

## Capabilities

### New Capabilities
- `guiones-de-entrevista`: gestión en el cliente de los guiones de entrevista propios del usuario, reutilizables entre ideas — listar paginado, crear, consultar, editar y eliminar, con un editor de preguntas ordenadas que garantiza un `orden` contiguo base 1 derivado de la posición y que envía siempre el conjunto completo, incluyendo los estados de carga/vacío/error y la traducción de los errores del contrato ramificada por `codigo` (`VALIDACION_FALLIDA`, `ACCESO_DENEGADO`, `RECURSO_NO_ENCONTRADO`).

### Modified Capabilities
- `shell-y-navegacion`: el shell aloja cuatro rutas hijas protegidas de un **segundo dominio de primer nivel** (`guiones`, `guiones/nuevo`, `guiones/:idGuion`, `guiones/:idGuion/editar`) con carga diferida, y ofrece navegación explícita entre `Ideas` y `Guiones`.

## Impact

- **Código**: nuevo árbol `src/app/features/guiones/` (servicio, listado, formulario con el editor de preguntas y detalle, con sus specs). `core/api/` gana `guion.model.ts`. `app.routes.ts` incorpora las cuatro rutas. El shell gana su barra de navegación y `shell.html`/`shell.spec.ts` se tocan por primera vez desde E0.
- **Hoja de estilos compartida**: `features/ideas/ideas.css` pasa a `shared/dominio.css`. Nunca fue específica de ideas —cabecera, botones, listas, campos, estados de carga/vacío/error— pero vivía allí porque `ideas` era el único dominio. Guiones es el primer consumidor fuera de ese árbol, así que se mueve al sitio que `CLAUDE.md` reserva para lo transversal. Las ocho features existentes cambian **una línea** cada una (su `styleUrl`), sin tocar el contenido de la hoja: la alternativa era duplicar ~250 líneas de CSS o importar desde una feature hermana, mintiendo sobre a quién pertenece.
- **Dependencias**: ninguna nueva. El reordenamiento se resuelve con controles de subir/bajar accesibles, sin librería de arrastre.
- **Contrato**: consume las rutas `/guiones` y `/guiones/{idGuion}` del tag `entrevistas`; **no** lo modifica.
- **Aislamiento multi-tenant**: el cliente nunca envía `ownerId` (lo deriva el token). El listado devuelve solo guiones propios; un guión ajeno alcanzado por URL directa responde `403` y la vista no revela contenido alguno.
- **Aguas abajo**: `guionId` y los `preguntaId` de este recurso son la precondición del registro de entrevistas del siguiente change, cuyas `respuestas` se capturan pregunta a pregunta contra el guión elegido. Ninguna entrevista se registra aquí.
- **Contrato incompleto conocido**: el `DELETE /guiones/{idGuion}` no define un `409` para un guión ya usado por entrevistas, ni qué ocurre con esas entrevistas. Hoy no hay entrevistas, así que no bloquea; se recoge como riesgo y se resuelve en el siguiente change, donde sí puede darse.
- **Zoneless**: todo el estado que la vista lee es signal; las mutaciones refrescan la UI recargando el recurso.
