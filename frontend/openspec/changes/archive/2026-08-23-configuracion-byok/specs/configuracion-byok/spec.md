## ADDED Requirements

### Requirement: Servicio de recurso del proveedor de IA contra el contrato
El cliente SHALL exponer un servicio inyectable de proveedores que encapsule las llamadas HTTP del tag `proveedores` del contrato de la configuración BYOK (`GET /proveedores`, `GET /proveedores/configuracion`, `PUT /proveedores/configuracion`, `DELETE /proveedores/configuracion`). El servicio MUST derivar los tipos del contrato (`ProveedorIA`, `ModeloIA`, `ConfiguracionByok`, `GuardarByokRequest`) y NUNCA MUST leer la `apiKey` de una respuesta: la key es write-only (RNF-07), se envía al guardar pero el servidor no la devuelve. El servicio MUST apoyarse en la plomería HTTP del E0 (interceptor de autorización y traducción del sobre `Error` a `ErrorApi`) sin reimplementarla.

#### Scenario: Las operaciones usan las rutas del contrato
- **WHEN** un componente invoca listar el catálogo, obtener, guardar o eliminar la configuración BYOK
- **THEN** el servicio emite la petición HTTP a la ruta y método correspondientes del tag `proveedores`

#### Scenario: La API key solo viaja de ida
- **WHEN** el servicio guarda la configuración
- **THEN** la `apiKey` viaja en el cuerpo del `PUT`, y el servicio nunca la lee ni la reexpone desde la respuesta

### Requirement: Configurar el proveedor de IA (BYOK) con catálogo curado
El cliente SHALL presentar una pantalla de configuración BYOK que consuma el catálogo curado (`GET /proveedores`) y ofrezca elegir `proveedor`, introducir la `apiKey` y fijar `modeloScoring` y `modeloVeredicto`. Los modelos ofrecidos MUST restringirse a los del proveedor elegido según el catálogo (RF-19), y los ids de modelo MUST tratarse como datos del catálogo, no como valores cableados (RNF-18). El envío MUST hacer `PUT /proveedores/configuracion` con validación local que bloquee el envío mientras falten campos. Si el catálogo no carga, el cliente MUST comunicar el error y permitir reintentar, sin ofrecer un formulario inconsistente.

#### Scenario: Guardar una configuración nueva
- **WHEN** el usuario elige proveedor, introduce su API key y selecciona los dos modelos, y envía
- **THEN** el cliente hace `PUT /proveedores/configuracion` con esos valores y confirma que la configuración se guardó

#### Scenario: Los modelos dependen del proveedor
- **WHEN** el usuario cambia el proveedor elegido
- **THEN** las opciones de `modeloScoring` y `modeloVeredicto` pasan a ser las del catálogo de ese proveedor

#### Scenario: Validación local bloquea el envío
- **WHEN** falta el proveedor, la API key o alguno de los modelos
- **THEN** el control de envío queda deshabilitado y no se emite la petición

#### Scenario: El catálogo no carga
- **WHEN** `GET /proveedores` falla
- **THEN** el cliente muestra el error y ofrece reintentar, sin renderizar un formulario sin catálogo

### Requirement: La API key nunca se revela en el cliente
El cliente NUNCA SHALL mostrar la API key registrada. Al cargar una configuración existente (`GET /proveedores/configuracion`), el cliente MUST prellenar el `proveedor` y los modelos pero MUST dejar el campo de la API key vacío, indicando mediante `apiKeyRegistrada` que ya hay una key registrada y que hace falta reintroducirla para cambiar la configuración. El campo de la API key MUST presentarse como campo sensible (no visible en claro por defecto).

#### Scenario: Config existente prellena todo salvo la key
- **WHEN** el usuario abre la configuración y ya tiene una BYOK guardada
- **THEN** el cliente prellena el proveedor y los modelos, deja la API key vacía e indica que hay una key registrada

#### Scenario: Sin configuración previa
- **WHEN** `GET /proveedores/configuracion` responde `404 RECURSO_NO_ENCONTRADO`
- **THEN** el cliente presenta el formulario vacío para configurar por primera vez, sin tratarlo como un error

### Requirement: Traducir los errores de validación de la key y del proveedor
El cliente SHALL traducir los errores del guardado por su `codigo` estable: `422 API_KEY_INVALIDA` MUST señalarse en el campo de la API key; `422 VALIDACION_FALLIDA` MUST mostrarse campo a campo desde `detalles` (p. ej. un modelo fuera del catálogo); `503 PROVEEDOR_IA_NO_DISPONIBLE` MUST mostrarse como indisponibilidad temporal con opción de reintentar. Ningún error MUST romper la vista.

#### Scenario: API key rechazada por el proveedor
- **WHEN** `PUT /proveedores/configuracion` responde `422 API_KEY_INVALIDA`
- **THEN** el cliente marca el campo de la API key como inválido y no da por guardada la configuración

#### Scenario: Proveedor no disponible al validar
- **WHEN** `PUT /proveedores/configuracion` responde `503 PROVEEDOR_IA_NO_DISPONIBLE`
- **THEN** el cliente muestra un aviso de indisponibilidad temporal y permite reintentar

### Requirement: Revocar la configuración BYOK
El cliente SHALL ofrecer, **solo** cuando existe una configuración registrada, la acción de revocar la BYOK vía `DELETE /proveedores/configuracion`, bajo confirmación explícita, comunicando que se borra también la credencial cifrada. Tras revocar, el cliente MUST reflejar que ya no hay configuración.

#### Scenario: Revocar bajo confirmación
- **WHEN** el usuario con una BYOK registrada confirma la revocación
- **THEN** el cliente hace `DELETE /proveedores/configuracion` y refleja que ya no hay configuración

#### Scenario: No se ofrece revocar sin configuración
- **WHEN** el usuario no tiene una BYOK registrada
- **THEN** el cliente no ofrece la acción de revocar
