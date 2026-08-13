## Why

Con E1 y E2 el usuario ya puede registrar ideas y declarar el criterio con el que las juzgará, pero **no tiene a quién entrevistar**. Las entrevistas de descubrimiento (E4) no pueden existir sin un contacto válido de la misma idea (RNF-14), así que el CRM es la dependencia dura del siguiente corte: sin él, el producto se queda en «tengo un experimento diseñado» y nunca llega a «tengo evidencia».

El CRM no es una agenda: es el **embudo de outreach**. Su valor está en registrar dónde se atasca la conversión —cuántos contactados respondieron, cuántos llegaron a agendar— porque de ahí salen los KPIs de alcance del grupo 7.1 (E5) que el agente pondera en el veredicto. Por eso el estado del contacto no es un campo editable más, sino una posición en un embudo con transiciones gobernadas, y por eso el outreach se limita a **dos toques por contacto** (RF-07): la disciplina de no insistir más allá del follow-up es lo que hace que la tasa de respuesta signifique algo.

Se construye contra `../contrato-api/openapi.yaml` (tag `contactos`), sin inspeccionar ni depender del código de `backend/`.

## What Changes

- **Modelos del contrato** (`core/api/contacto.model.ts`): `Contacto`, `EstadoOutreach` (6 estados), `CanalContacto` (`linkedin`/`correo`/`mensajeria`/`otro`), `OrigenContacto` (`busqueda_directa`/`referido`/`comunidad`/`evento`/`otro`), `CrearContactoRequest`, `ActualizarContactoRequest`, `TransicionEstadoRequest` y `RegistrarToqueRequest`. Reutiliza el sobre `RespuestaPaginada<T>` ya existente.
- **Servicio de recurso** (`features/ideas/contactos/`): `ContactosService` con las siete operaciones del tag (`crear`, `listar` paginado con filtro, `consultar`, `editar`, `eliminar`, `transicionar`, `registrarToque`), todas con el `ideaId` en el path y ninguna enviando `ideaId`, `ownerId`, `estado` ni fechas de toque en el cuerpo.
- **Lista del embudo** (`ideas/:id/contactos`): página que consume `GET /ideas/{id}/contactos` con `pagina`/`porPagina` y **filtro por `estado`**, mostrando de cada contacto su `nombre`, `perfil`, `canal`, su posición en el embudo y cuántos toques lleva. Estados de carga, vacío y error, con el mismo patrón del portafolio (E1).
- **Alta de contacto** (Signal Forms): `nombre` obligatorio; `perfil`, `enlace` y `notas` opcionales; `canal` y `origen` como selects del catálogo. El contacto nace `por_contactar`, así que el formulario **no** expone control de estado ni de toques.
- **Detalle de contacto** (`ideas/:id/contactos/:idContacto`): consume el `GET` individual y muestra el contenido, quién lo refirió si aplica, el historial de toques y las acciones disponibles. Es el hogar de la edición y de las dos acciones de embudo.
- **Transición del embudo**: `POST .../estado` hacia los destinos alcanzables desde el estado actual. La UI **no ofrece `entrevistado`**: ese estado solo lo origina el registro de una entrevista (E4). Un `409 CONFLICTO` (transición no permitida) se traduce a un mensaje que explica el porqué, sin romper la vista.
- **Registro de toques con el límite de dos**: `POST .../toques` con `fecha` opcional. La UI refleja cuántos toques van (`primerToqueEn`/`segundoToqueEn`), **retira la acción al llegar a dos** y traduce el `409` del tercero explicando que el límite es parte de la disciplina de outreach, no un fallo.
- **Referidos**: cuando `origen` es `referido`, el formulario ofrece elegir `referidoPorId` entre **contactos de la misma idea**, y el detalle muestra quién refirió a la persona.
- **Eliminación con confirmación en línea**, sin `window.confirm`, siguiendo el patrón ya establecido en hipótesis.
- **Rutas y navegación**: `ideas/:id/contactos` y `ideas/:id/contactos/:idContacto` como rutas hijas protegidas del shell con carga diferida; el detalle de la idea gana el acceso a sus contactos junto a hipótesis y umbrales.

**Fuera de alcance**: entrevistas y su scoring (E4) —incluido el estado `entrevistado`, que se origina allí—, los KPIs de outreach calculados sobre este embudo (E5) y el veredicto (E6).

## Capabilities

### New Capabilities
- `crm-de-contactos`: gestión en el cliente de los contactos de una idea y su embudo de outreach — listar paginado con filtro por estado, crear, consultar, editar, eliminar, transicionar por el embudo (sin poder asignar `entrevistado`) y registrar hasta dos toques por contacto, incluyendo el vínculo de referido dentro de la misma idea, los estados de carga/vacío/error y la traducción de los errores del contrato ramificada por `codigo` (`VALIDACION_FALLIDA`, `CONFLICTO`, `ACCESO_DENEGADO`, `RECURSO_NO_ENCONTRADO`).

### Modified Capabilities
- `portafolio-de-ideas`: el detalle de una idea ofrece además el acceso a sus **contactos**, junto a los de hipótesis y umbrales ya existentes.
- `shell-y-navegacion`: el shell aloja dos rutas hijas protegidas más del dominio `ideas` (`ideas/:id/contactos` e `ideas/:id/contactos/:idContacto`) con carga diferida.

## Impact

- **Código**: nuevo árbol `src/app/features/ideas/contactos/` (servicio, etiquetas del catálogo, lista, formulario y detalle con sus specs). `core/api/` gana `contacto.model.ts`. `app.routes.ts` incorpora las dos rutas hijas. El detalle de idea gana un enlace más.
- **Dependencias**: ninguna nueva.
- **Contrato**: consume el tag `contactos` completo; **no** lo modifica.
- **Aislamiento multi-tenant**: el cliente nunca envía `ownerId` ni `ideaId` en el cuerpo (el `ideaId` va en el path). Un contacto es **información personal**: la UI nunca debe revelar contenido ante un `403 ACCESO_DENEGADO`.
- **Aguas abajo**: este embudo es el origen de los KPIs de alcance de E5 (tasa de respuesta, de agendamiento, de conversión a entrevista, velocidad de pipeline) y la precondición de las entrevistas de E4, que exigen un contacto válido de la misma idea. Ningún cálculo de KPI ocurre aquí.
- **Zoneless**: todo el estado que la vista lee es signal; las mutaciones refrescan la UI recargando el recurso.
