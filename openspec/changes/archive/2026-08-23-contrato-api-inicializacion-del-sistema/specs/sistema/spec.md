## ADDED Requirements

### Requirement: Inicialización del sistema
El contrato SHALL definir un endpoint `POST /sistema/inicializar`, bajo el `tag` `sistema`, que crea la cuenta administradora de origen de la instalación. El cuerpo MUST aceptar `email`, `nombre` y `password` con las mismas reglas de validación que el registro; un payload inválido MUST devolver `422 VALIDACION_FALLIDA`. La respuesta exitosa MUST devolver el recurso `Usuario` creado, con `rol` `administrador` y `estado` `activo`, y MUST NOT incluir credenciales, `accessToken` ni cookie de sesión. Este endpoint SHALL ser el único origen del rol `administrador` en el contrato; `POST /usuarios/registro` NO SHALL verse afectado y sigue asignando `validador`.

#### Scenario: Inicialización exitosa de un sistema virgen
- **WHEN** se hace `POST /sistema/inicializar` con el secreto de despliegue correcto, un `email` no registrado y un payload válido, sobre un sistema sin inicializar
- **THEN** el contrato responde `201` con un `Usuario` cuyo `rol` es `administrador` y cuyo `estado` es `activo`
- **AND** la respuesta no incluye la contraseña, ningún hash, ningún token ni cookie de sesión

#### Scenario: Payload inválido
- **WHEN** se hace `POST /sistema/inicializar` con el secreto correcto pero un cuerpo que no cumple las reglas de validación
- **THEN** el contrato responde `422` con `codigo` `VALIDACION_FALLIDA`
- **AND** el sistema permanece sin inicializar

#### Scenario: El registro público conserva su rol
- **WHEN** se hace `POST /usuarios/registro` con un payload válido, esté el sistema inicializado o no
- **THEN** el contrato responde `201` con un `Usuario` cuyo `rol` es `validador`

### Requirement: La inicialización exige el secreto de despliegue
El contrato SHALL definir un `securityScheme` `bootstrapToken` de tipo `apiKey` transportado en la cabecera `X-Bootstrap-Token`, cuyo valor fija el operador en el entorno del despliegue. `POST /sistema/inicializar` MUST declararlo como su esquema de seguridad en lugar de anular la seguridad global (`security: []`). Una petición sin la cabecera, o con un valor que no coincide con el configurado, MUST devolver `401 NO_AUTENTICADO` y MUST NOT crear ninguna cuenta ni alterar el estado del sistema. El secreto NO SHALL viajar en el cuerpo de la petición ni en la URL.

#### Scenario: Sin la cabecera del secreto
- **WHEN** se hace `POST /sistema/inicializar` sin la cabecera `X-Bootstrap-Token` sobre un sistema sin inicializar
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`
- **AND** no se crea ninguna cuenta
- **AND** el sistema permanece sin inicializar, disponible para una llamada posterior con el secreto correcto

#### Scenario: Secreto incorrecto
- **WHEN** se hace `POST /sistema/inicializar` con un valor de `X-Bootstrap-Token` que no coincide con el configurado
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`
- **AND** la respuesta no revela si el sistema está inicializado ni ningún dato de la instalación

#### Scenario: Un token de sesión no sustituye al secreto
- **WHEN** se hace `POST /sistema/inicializar` presentando un `accessToken` válido en `Authorization` pero sin `X-Bootstrap-Token`
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`

### Requirement: La inicialización es de un solo uso e irreversible
El contrato SHALL declarar el estado «inicializado» como permanente. Una vez inicializado el sistema, toda llamada posterior a `POST /sistema/inicializar` MUST devolver `409 CONFLICTO` y MUST NOT crear ninguna cuenta, **aunque presente el secreto de despliegue correcto**: el secreto autoriza la operación, no la vuelve repetible. El contrato NO SHALL definir ninguna operación que devuelva el sistema a estado no inicializado. Cuando dos peticiones válidas concurren sobre un sistema virgen, como mucho una MUST resultar en una cuenta administradora creada.

#### Scenario: Segunda llamada con el secreto correcto
- **WHEN** se hace `POST /sistema/inicializar` con el secreto correcto y un payload válido sobre un sistema ya inicializado
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`
- **AND** no se crea ninguna cuenta ni se altera la cuenta administradora existente

#### Scenario: Llamadas simultáneas sobre un sistema virgen
- **WHEN** dos peticiones válidas a `POST /sistema/inicializar` llegan a la vez sobre un sistema sin inicializar
- **THEN** como mucho una responde `201` creando la cuenta administradora
- **AND** la otra responde `409` con `codigo` `CONFLICTO`

#### Scenario: No existe reversa
- **WHEN** se recorre el contrato en busca de una operación que des-inicialice el sistema o permita una segunda cuenta administradora de origen
- **THEN** no existe ninguna
- **AND** promover a otro administrador solo es posible con `PATCH /usuarios/{id}/rol`, que exige ya ser administrador
