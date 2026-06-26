## Why

Con E0 (`usuarios`), E1 (portafolio de `ideas`) y E2 (hipótesis y umbrales) ya definidos en el contrato, el siguiente paso del camino crítico del MVP es **E3 (Outreach y CRM de contactos)**. El `tag` `contactos` ya está declarado pero aún sin endpoints. Los contactos son el pipeline de descubrimiento: sin ellos no hay a quién entrevistar, y las entrevistas de E4 —que el agente puntúa— **no pueden existir sin un contacto válido** (RNF-14). Además, el embudo de outreach es lo que alimenta los KPIs de alcance de E5 (`tasa_respuesta`, `tasa_agendamiento`, `tasa_conversion_entrevista`, `velocidad_pipeline`). Sin este contrato, frontend y backend no pueden construir la captura de contactos ni el seguimiento del embudo sobre el que se apoyan E4 y E5.

## What Changes

- **Definir el contrato del CRM de contactos** (RF-05, HU-07) bajo el `tag` `contactos`, anidado en `/ideas/{id}/contactos` (los contactos cuelgan de la idea, SRS §5): crear, listar (paginado, con filtro por estado de outreach), consultar, editar y eliminar contactos con su `perfil`, `canal` y `origen`.
- **Definir la transición por el embudo de outreach** (RF-06, HU-08) mediante `POST /ideas/{id}/contactos/{idContacto}/estado`: mover el contacto entre `por_contactar → contactado → respondio → agendado → entrevistado → descartado`, validando transiciones; una transición inválida devuelve `409 CONFLICTO`. El estado `entrevistado` solo se alcanza al registrar una entrevista (E4), no de forma manual.
- **Definir el registro de toques con límite de dos** (RF-07, HU-09) mediante `POST /ideas/{id}/contactos/{idContacto}/toques`: registra la fecha del primer toque y de un único follow-up; el tercer toque devuelve `409 CONFLICTO`.
- **Soportar cadenas de referidos** (HU-10) con `origen` y `referidoPorId` en el contacto, de modo que un contacto pueda registrarse como referido de otro y se pueda trazar la cadena (base del KPI `tasa_referidos`).
- **Añadir los schemas de dominio** a `components.schemas`: `EstadoOutreach`, `CanalContacto`, `OrigenContacto`, `Contacto`, `CrearContactoRequest`, `ActualizarContactoRequest`, `TransicionEstadoRequest`, `RegistrarToqueRequest` y el sobre `ContactosPaginados`; más el parámetro de path `idContacto`.
- **Reflejar el aislamiento multi-tenant (RF-02, RNF-04/05/13):** todas las rutas operan solo sobre recursos del usuario autenticado; el `ownerId` se deriva del token de la idea padre, y operar sobre una idea (o contacto) ajena devuelve `403 ACCESO_DENEGADO`. Los datos de contacto son información personal y nunca se exponen a otro usuario.
- **Respetar las convenciones ya definidas** y reutilizar componentes existentes (`bearerAuth` global, `Error`/`CodigoError`, parámetros de paginación, respuestas compartidas, parámetro `idIdea`).

## Capabilities

### New Capabilities
- `contactos`: CRM de contactos y embudo de outreach por idea (épica E3) — alta y gestión de contactos, transición por los estados del embudo con límite de dos toques, y trazado de referidos, todo aislado por usuario. La expresión de esta capacidad es el detalle del `tag` `contactos` en el contrato de API.

### Modified Capabilities
<!-- Ninguna: E3 introduce la capacidad `contactos`; no cambia los requisitos de `usuarios`, `ideas` ni `contrato-api`. -->

## Impact

- **`contrato-api/openapi.yaml`:** se añaden los `paths` anidados `/ideas/{id}/contactos[...]` (con las acciones `/estado` y `/toques`) y sus schemas de dominio bajo el `tag` `contactos`. No se tocan otros módulos.
- **Convenciones:** se reutilizan los componentes existentes; este cambio **no** introduce convenciones ni códigos de error nuevos (la `409 CONFLICTO` por "transición de outreach inválida" ya está prevista en el catálogo `CodigoError`).
- **Equipos:** frontend (tablero/lista de contactos, formularios de alta y edición, acciones de embudo y toques) y backend (módulo NestJS `contactos`) ya pueden desarrollar E3 contra el contrato.
- **Fuera de alcance:** las entrevistas y su scoring (E4) —aunque crear una entrevista moverá el contacto a `entrevistado`, ese endpoint se define en E4—, el **cálculo** de los KPIs de outreach (E5) y todo código de runtime. Este cambio solo define cómo se capturan, mueven y siguen los contactos.
