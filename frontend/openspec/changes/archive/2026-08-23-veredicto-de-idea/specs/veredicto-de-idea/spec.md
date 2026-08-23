## ADDED Requirements

### Requirement: Servicio de recurso del veredicto contra el contrato
El cliente SHALL exponer un servicio inyectable de veredictos que encapsule las llamadas HTTP del tag `agente` del contrato (`POST /ideas/{id}/veredictos`, `GET /ideas/{id}/veredictos`, `GET /ideas/{id}/veredictos/{idVeredicto}`, `POST /ideas/{id}/veredictos/{idVeredicto}/verificacion`). El servicio MUST derivar los tipos del contrato (`Veredicto`, `VerificarVeredictoRequest`, `RespuestaPaginada<Veredicto>`) y NUNCA MUST enviar `ownerId` ni el bloque del agente (`veredicto`, `confianza`, `justificacionPorKPI`, `snapshotKpis`) en ninguna petición: el emitir no lleva cuerpo de negocio y la verificación se limita a `resultado` y `nota`. El servicio MUST apoyarse en la plomería HTTP del E0 (interceptor de autorización y traducción del sobre `Error` a `ErrorApi`) sin reimplementarla.

#### Scenario: Las operaciones usan las rutas del contrato
- **WHEN** un componente invoca emitir, listar, consultar o verificar un veredicto
- **THEN** el servicio emite la petición HTTP a la ruta y método correspondientes del tag `agente`

#### Scenario: El emitir no lleva cuerpo de negocio
- **WHEN** el servicio construye la petición de emitir un veredicto
- **THEN** el cuerpo no incluye `ownerId`, ni proveedor, ni modelo, ni el bloque del agente: el proveedor y el modelo salen de la config BYOK en el servidor

### Requirement: Emitir un veredicto invocando al agente
El cliente SHALL ofrecer, sobre una idea propia, la acción de **emitir un veredicto** vía `POST /ideas/{id}/veredictos`, comunicando que el agente pondera los KPIs vigentes y que la operación puede tardar (latencia del LLM). Tras una emisión exitosa el cliente MUST llevar al usuario al veredicto recién emitido para su revisión. El cliente MUST traducir por `codigo`: `409 CONFLICTO` (sin config BYOK) a un aviso de configurar el proveedor; `502 SALIDA_AGENTE_INVALIDA` a un aviso de reintentar; `503 PROVEEDOR_IA_NO_DISPONIBLE` a un aviso de indisponibilidad temporal; sin romper la vista.

#### Scenario: Emisión exitosa
- **WHEN** el usuario emite un veredicto de una idea suya
- **THEN** el cliente hace `POST /ideas/{id}/veredictos` y, al recibir `201`, lleva al usuario al veredicto emitido en verificación `pendiente`

#### Scenario: Sin configuración BYOK
- **WHEN** `POST /ideas/{id}/veredictos` responde `409 CONFLICTO`
- **THEN** el cliente muestra que hace falta configurar el proveedor de IA (BYOK) antes de emitir, sin romper la vista

#### Scenario: El proveedor de IA no está disponible
- **WHEN** `POST /ideas/{id}/veredictos` responde `503 PROVEEDOR_IA_NO_DISPONIBLE`
- **THEN** el cliente muestra un aviso de indisponibilidad temporal y permite reintentar

### Requirement: Historial paginado de veredictos de una idea
El cliente SHALL presentar el historial de veredictos de una idea propia consumiendo `GET /ideas/{id}/veredictos` con `pagina`/`porPagina`, mostrando de cada uno su `veredicto` (go/pivote/kill), su `estadoVerificacion` y su `confianza`, con controles de paginación derivados del bloque `paginacion`. El cliente MUST distinguir un **estado vacío** (aún sin veredictos) de un error, y ramificar los errores por el `codigo` estable del `ErrorApi`. El estado que la vista lee MUST ser reactivo por signals (zoneless).

#### Scenario: Historial inicial paginado
- **WHEN** el usuario abre el veredicto de una idea con veredictos previos
- **THEN** el cliente pide `GET /ideas/{id}/veredictos` con `pagina`/`porPagina` y los lista con su juicio, su estado y su confianza

#### Scenario: Idea sin veredictos
- **WHEN** `GET /ideas/{id}/veredictos` responde una página sin veredictos
- **THEN** el cliente muestra un estado vacío que invita a emitir el primero, no una lista en blanco ni un error

#### Scenario: Idea ajena
- **WHEN** `GET /ideas/{id}/veredictos` responde `403 ACCESO_DENEGADO`
- **THEN** el cliente muestra un mensaje de acceso denegado sin revelar el historial

### Requirement: Detalle del veredicto con su razonamiento y snapshot
El cliente SHALL presentar el detalle de un veredicto consumiendo `GET /ideas/{id}/veredictos/{idVeredicto}`, mostrando el juicio (`veredicto`), la `confianza`, la `justificacionPorKPI` (con el nombre legible de cada KPI), las `recomendaciones`, el `proveedor` y `modelo` con que se emitió, y el `snapshotKpis` congelado. El cliente NO SHALL recalcular ni reinterpretar el snapshot: lo presenta tal como llega (RNF-15, RNF-09). El nombre legible de cada KPI MUST salir del catálogo compartido con umbrales y tablero, para que un mismo KPI se lea igual en todas las pantallas.

#### Scenario: Detalle del veredicto
- **WHEN** el usuario abre un veredicto suyo
- **THEN** el cliente hace `GET /ideas/{id}/veredictos/{idVeredicto}` y muestra el juicio, la confianza, el razonamiento por KPI, las recomendaciones y el snapshot de KPIs

#### Scenario: El snapshot se presenta tal cual
- **WHEN** el detalle muestra el `snapshotKpis`
- **THEN** el cliente lo presenta con los valores y zonas que llegan del servidor, sin recalcularlos

### Requirement: Verificación humana del veredicto en modo consultivo
El cliente SHALL ofrecer, **solo** mientras el veredicto está en `estadoVerificacion` `pendiente`, las acciones de **aprobar** y **anular** vía `POST /ideas/{id}/veredictos/{idVeredicto}/verificacion`. Aprobar MUST comunicar que hace firme el veredicto y cambia el estado de la idea (`go`/`pivote`/`kill`). Anular MUST exigir una `nota` no vacía mediante validación local que bloquee el envío, y MUST dejar claro que no cambia el estado de la idea. Un veredicto ya verificado (`409 CONFLICTO`) MUST traducirse a un aviso sin romper la vista; un `422 VALIDACION_FALLIDA` (nota faltante) MUST mostrarse en el campo. Tras verificar, el cliente MUST reflejar el nuevo `estadoVerificacion` y la `verificacion` registrada, conservando el bloque del agente.

#### Scenario: Aprobar un veredicto pendiente
- **WHEN** el usuario aprueba un veredicto suyo en estado `pendiente`
- **THEN** el cliente hace `POST .../verificacion` con `resultado` `aprobado` y refleja el veredicto `aprobado` con su verificación

#### Scenario: Anular exige una nota
- **WHEN** el usuario intenta anular sin escribir una nota
- **THEN** el control de envío queda deshabilitado y no se emite la petición

#### Scenario: Anular con nota
- **WHEN** el usuario anula un veredicto suyo escribiendo una nota
- **THEN** el cliente hace `POST .../verificacion` con `resultado` `anulado` y la `nota`, y refleja el veredicto `anulado`

#### Scenario: Un veredicto ya verificado no ofrece acciones
- **WHEN** el usuario abre un veredicto en estado `aprobado` o `anulado`
- **THEN** el cliente no ofrece las acciones de aprobar ni anular y muestra la verificación registrada
