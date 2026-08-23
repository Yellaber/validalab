## Why

Con E0–E3 y E4a el usuario ya tiene ideas, hipótesis, umbrales, contactos y guiones. Tiene, en otras palabras, **todo el aparato para preguntar y a nadie a quien haya preguntado todavía**. La entrevista es la evidencia: sin ella no hay nada que puntuar (E4b-2), nada que agregar en KPIs (E5) y nada sobre lo que dictaminar un veredicto (E6). Es el eslabón que convierte el método en datos.

Es también donde convergen por primera vez las tres piezas anteriores: una entrevista vincula una **idea**, un **contacto** de esa misma idea y un **guión** propio, y captura una respuesta **por cada pregunta del guión**. Esa convergencia es lo que hace el change interesante y lo que RNF-14 protege: una entrevista no puede existir sin idea y contacto válidos del mismo usuario.

Registrar una entrevista tiene además dos efectos que el cliente no controla pero debe reflejar: **mueve el contacto a `entrevistado`** —el único camino que E3 dejó reservado para ese estado— y **dispara el scoring automático del agente**.

Este change cubre la **captura de la evidencia**. Leer y corregir el juicio del agente sobre ella es el siguiente (`scoring-y-ajuste`), siguiendo la tríada del SRS: aquí el usuario alimenta; allí el agente ejecuta y el humano verifica.

Se construye contra `../contrato-api/openapi.yaml` (tag `entrevistas`, rutas anidadas bajo la idea), sin inspeccionar ni depender del código de `backend/`.

## What Changes

- **Modelos del contrato** (`core/api/entrevista.model.ts`): `Entrevista`, `RespuestaEntrevista`, `Cita`, `EstadoScoring` (4 estados), `CrearEntrevistaRequest`, `CrearCitaRequest` y `ActualizarEntrevistaRequest`. Los tipos del bloque de score (`ScoreEntrevista`, `SenalesEstructuradas`, `AjusteScore`) se declaran ahora —vienen en la misma respuesta y el modelo debe ser fiel— pero **solo se leen** en el siguiente change.
- **Servicio de recurso** (`features/ideas/entrevistas/`): `EntrevistasService` con `crear`, `listar` (paginado, con los dos filtros del contrato), `consultar`, `editar` y `eliminar`. Las acciones `puntuar` y `ajustarScore` quedan para el siguiente change.
- **Listado** (`ideas/:id/entrevistas`): consume `GET` con `pagina`/`porPagina` y **filtro por `contactoId` y por `estadoScoring`**, mostrando de cada entrevista el contacto entrevistado, el guión usado, la fecha y su estado de scoring. Estados de carga, vacío y error con el patrón ya establecido.
- **Alta de entrevista** (Signal Forms): elegir **contacto** entre los de la idea que aún pueden entrevistarse, elegir **guión** entre los propios, y capturar **una respuesta por cada pregunta del guión elegido**, en su orden. El contrato exige al menos una respuesta.
- **Captura de citas**: lista de longitud variable con `texto` obligatorio y `contexto` opcional, añadibles y eliminables. A diferencia de las preguntas de un guión, **las citas no tienen orden** y **pueden ser cero**.
- **Detalle** (`ideas/:id/entrevistas/:idEntrevista`): muestra el contacto, el guión, cada respuesta **junto al texto de la pregunta que contesta**, las citas y el estado del scoring. El bloque `score` y el ajuste **no se renderizan aquí**: son del siguiente change.
- **Edición**: solo `respuestas` y `citas`. El contrato no permite cambiar `contactoId` ni `guionId`, así que el formulario de edición **no ofrece esos selectores**. Cambiar las respuestas **invalida el score previo**, y la UI debe advertirlo antes de guardar.
- **Eliminación con confirmación en línea**, sin `window.confirm`.
- **Traducción de los errores propios de este tag**: `422 ENTREVISTA_SIN_VINCULO` (idea o contacto sin vínculo válido) y `409 CONFLICTO` (contacto ya `entrevistado` o `descartado`) se explican como reglas del método, no como fallos.
- **Rutas y navegación**: cuatro rutas hijas protegidas bajo `ideas/:id/entrevistas` con carga diferida; el detalle de la idea gana el acceso a sus entrevistas junto a hipótesis, umbrales y contactos.

**Fuera de alcance**: todo lo que rodea al juicio del agente —bloque `score` con señales y trazabilidad, `estadoScoring` con polling, `POST .../puntuar` y `POST .../ajuste-score`—, que es el change `scoring-y-ajuste`; los KPIs que agregan estas entrevistas (E5); el veredicto (E6); y la re-evaluación en lote (E8).

## Capabilities

### New Capabilities
- `registro-de-entrevistas`: captura en el cliente de las entrevistas de descubrimiento de una idea — listar paginado con filtro por contacto y por estado de scoring, registrar una entrevista vinculando contacto y guión y capturando una respuesta por cada pregunta del guión más citas textuales opcionales, consultar el detalle con cada respuesta junto a su pregunta, editar respuestas y citas advirtiendo que se invalida el score, eliminar con confirmación en línea, y traducir los errores del contrato ramificados por `codigo` (`ENTREVISTA_SIN_VINCULO`, `CONFLICTO`, `VALIDACION_FALLIDA`, `ACCESO_DENEGADO`, `RECURSO_NO_ENCONTRADO`).

### Modified Capabilities
- `portafolio-de-ideas`: el detalle de una idea ofrece además el acceso a sus **entrevistas**, junto a los de hipótesis, umbrales y contactos.
- `shell-y-navegacion`: el shell aloja cuatro rutas hijas protegidas más del dominio `ideas` (listado, alta, detalle y edición de entrevistas) con carga diferida.

## Impact

- **Código**: nuevo árbol `src/app/features/ideas/entrevistas/` (servicio, listado, formulario, detalle y sus specs). `core/api/` gana `entrevista.model.ts`. `app.routes.ts` incorpora las cuatro rutas. El detalle de idea gana un enlace más.
- **Dependencias entre features**: el formulario consume `GuionesService` (de `features/guiones/`) y `ContactosService` (de `features/ideas/contactos/`) para poblar sus dos selectores. Es la primera vez que una feature del frontend depende de los servicios de otras dos; se hace **solo a través de sus servicios**, nunca de sus componentes.
- **Contrato**: consume las rutas `/ideas/{id}/entrevistas[...]` salvo `puntuar` y `ajuste-score`; **no** lo modifica.
- **Aislamiento multi-tenant**: el cliente nunca envía `ideaId` (va en el path) ni `ownerId`, y nunca el bloque `score`, que produce el agente.
- **Efectos que el cliente refleja pero no controla**: crear una entrevista mueve el contacto a `entrevistado` y dispara el scoring. La lista de contactos entrevistables debe recargarse después de un alta.
- **Aguas abajo**: estas entrevistas son el insumo del scoring (change siguiente), de los KPIs de calidad del descubrimiento y señal de problema/pago (E5) y del veredicto (E6).
- **Zoneless**: todo el estado que la vista lee es signal; las mutaciones refrescan la UI recargando el recurso.
