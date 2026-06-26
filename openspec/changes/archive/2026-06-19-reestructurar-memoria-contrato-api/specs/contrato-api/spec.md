## ADDED Requirements

### Requirement: Contrato de API como fuente de verdad única
El contrato de API SHALL ser la única fuente de verdad que dirige el desarrollo de `frontend/` y `backend/`. Cada equipo MUST desarrollar contra el contrato sin conocer ni depender del código del otro paquete. Cualquier endpoint, payload o comportamiento de borde entre cliente y servidor MUST estar definido en el contrato antes de implementarse en cualquiera de los dos paquetes.

#### Scenario: Frontend implementa contra el contrato
- **WHEN** el equipo de frontend necesita consumir un endpoint del backend
- **THEN** toma la definición de request, response y errores del contrato de API
- **AND** no inspecciona ni importa código de `backend/` para conocer la forma de los datos

#### Scenario: Backend implementa contra el contrato
- **WHEN** el equipo de backend implementa o modifica un endpoint
- **THEN** lo hace conforme a la definición del contrato de API
- **AND** no asume detalles de `frontend/` ni acopla su implementación a ese paquete

#### Scenario: Cambio de comportamiento entre cliente y servidor
- **WHEN** se requiere cambiar la forma de un request, response o error compartido
- **THEN** el cambio se introduce primero en el contrato de API
- **AND** solo después se implementa en frontend y/o backend

### Requirement: Documento de contrato único en ubicación canónica
El contrato SHALL materializarse como un **único documento OpenAPI** en una ubicación canónica del monorepo, accesible por ambos paquetes. NO debe partirse en varios ficheros por módulo de dominio. El documento OpenAPI MUST ser la referencia normativa vinculante de toda interacción cliente-servidor.

#### Scenario: Equipo localiza el contrato
- **WHEN** cualquiera de los dos equipos necesita el contrato
- **THEN** lo encuentra como un único documento OpenAPI en la ubicación canónica documentada en `CLAUDE.md`
- **AND** no existe una copia divergente ni un fragmento separado dentro de `frontend/` o `backend/`

#### Scenario: No existe fragmentación por módulo
- **WHEN** se revisa la estructura del contrato
- **THEN** todos los endpoints residen en el mismo documento OpenAPI
- **AND** no hay ficheros de contrato separados por módulo

### Requirement: Organización interna por tags de dominio
Dentro del documento único, los endpoints SHALL organizarse mediante `tags` de OpenAPI correspondientes a los módulos de dominio del backend: `usuarios`, `ideas`, `contactos`, `entrevistas`, `kpis`, `agente` y `proveedores`. Los `tags` MUST permitir navegar el contrato por dominio sin necesidad de fragmentarlo en varios archivos.

#### Scenario: Se añade un endpoint de un dominio existente
- **WHEN** se agrega un endpoint del dominio de entrevistas
- **THEN** su definición se incorpora al documento OpenAPI único bajo el `tag` `entrevistas`
- **AND** el contrato sigue siendo un solo documento

### Requirement: Convenciones transversales con detalle en el contrato
El contrato SHALL declarar las convenciones transversales que ambos equipos MUST honrar siempre: esquema de autenticación, aislamiento multi-tenant por `owner_id`, formato estándar de error, paginación y convención de nombres. En `CLAUDE.md` MUST residir únicamente el **resumen normativo** de cada convención (la regla en pocas líneas); el **detalle extenso** —como el catálogo completo de códigos de error— MUST vivir dentro del documento OpenAPI, no en `CLAUDE.md`.

#### Scenario: Endpoint nuevo respeta las convenciones
- **WHEN** se define un endpoint que devuelve un listado de recursos de un usuario
- **THEN** aplica el formato de paginación y de error declarados en las convenciones
- **AND** filtra los datos por el `owner_id` del usuario autenticado conforme a la regla de aislamiento

#### Scenario: Consulta rápida de la regla
- **WHEN** un equipo necesita la regla de autenticación o el formato de error
- **THEN** encuentra el resumen normativo directamente en `CLAUDE.md`

#### Scenario: Consulta del detalle extenso
- **WHEN** un equipo necesita el catálogo completo de códigos de error
- **THEN** lo encuentra en el documento OpenAPI, enlazado desde `CLAUDE.md`
- **AND** ese catálogo no está embebido en `CLAUDE.md`

### Requirement: CLAUDE.md acotado y consultable de forma integral
`CLAUDE.md` SHALL contener únicamente el índice navegable hacia el contrato y el resumen normativo de las convenciones transversales, no el detalle de endpoints ni los catálogos extensos. El detalle voluminoso y de cambio rápido MUST vivir en el documento OpenAPI. El índice MUST enlazar al documento OpenAPI, de modo que la consulta siga siendo integral: seguir el índice desde `CLAUDE.md` alcanza todo el detalle del contrato.

#### Scenario: La memoria no crece con cada endpoint
- **WHEN** se añaden o modifican endpoints en el documento OpenAPI
- **THEN** `CLAUDE.md` no cambia salvo que cambie una convención transversal o el índice
- **AND** el tamaño de `CLAUDE.md` permanece acotado y estable

#### Scenario: Consulta integral desde la memoria
- **WHEN** un equipo parte de `CLAUDE.md` para entender un endpoint concreto
- **THEN** sigue el enlace del índice hacia el documento OpenAPI
- **AND** alcanza el detalle completo sin que ese detalle esté embebido en `CLAUDE.md`

### Requirement: No duplicación del contrato en los paquetes
Los archivos `frontend/CLAUDE.md` y `backend/CLAUDE.md` SHALL referenciar el contrato y `CLAUDE.md` de la raíz como fuente de verdad, sin duplicar el contrato. Ningún paquete MUST mantener su propia copia del contrato.

#### Scenario: Un paquete necesita el contrato
- **WHEN** se consulta `frontend/CLAUDE.md` o `backend/CLAUDE.md`
- **THEN** este apunta al contrato canónico y a `CLAUDE.md` de la raíz
- **AND** no contiene una copia del contrato que pueda divergir de la fuente
