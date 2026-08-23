## ADDED Requirements

### Requirement: Endpoint de inicialización del sistema
El backend SHALL exponer `POST /sistema/inicializar` en un módulo `sistema`, marcado `@Publico()` para que el `JwtAuthGuard` global no exija token. El cuerpo SHALL validarse con un DTO Zod (`nestjs-zod`) con las mismas reglas que el registro (`email` con formato, `nombre` no vacío, `password` de al menos 8 caracteres); un cuerpo inválido MUST rechazarse con `VALIDACION_FALLIDA`. La respuesta exitosa MUST devolver el usuario creado con `rol` `administrador` y `estado` `activo`, y MUST NOT incluir `passwordHash`, `accessToken` ni cookie de refresh. El endpoint MUST documentarse en Swagger bajo el `tag` `sistema` con su esquema de seguridad propio.

#### Scenario: Inicialización exitosa
- **WHEN** llega una petición con el secreto correcto y un cuerpo válido sobre un sistema sin inicializar
- **THEN** el backend crea la cuenta con rol `administrador` y estado `activo`
- **AND** responde `201` con el DTO de usuario, sin `passwordHash` ni credenciales
- **AND** no emite `accessToken` ni establece la cookie de refresh

#### Scenario: Cuerpo inválido
- **WHEN** llega una petición con el secreto correcto y un cuerpo que no cumple el esquema Zod
- **THEN** el pipe de validación global la rechaza con `VALIDACION_FALLIDA` enumerando los campos inválidos
- **AND** no se crea ninguna cuenta ni se marca el sistema como inicializado

#### Scenario: El registro público conserva su rol
- **WHEN** se invoca `UsuariosService.registrar` desde `POST /usuarios/registro`, con el sistema inicializado o sin inicializar
- **THEN** la cuenta creada tiene rol `validador`
- **AND** ninguna firma del camino público admite un rol distinto como parámetro

### Requirement: El secreto de despliegue protege la inicialización
El backend SHALL proteger el endpoint con un guard propio que exige la cabecera `X-Bootstrap-Token` y la compara con `BOOTSTRAP_TOKEN`, leído mediante `AppConfigService`. La comparación MUST hacerse en tiempo constante para no filtrar información por temporización. Una petición sin la cabecera, con un valor que no coincide, o cuando el secreto no está configurado en el servidor, MUST rechazarse con `NO_AUTENTICADO` sin crear ninguna cuenta ni alterar el estado del sistema. El guard NO SHALL inspeccionar la cabecera `Authorization`. La respuesta al cliente MUST ser idéntica en todos los casos de fallo, sin revelar si el sistema está inicializado ni si el servidor tiene secreto configurado.

#### Scenario: Sin la cabecera del secreto
- **WHEN** llega una petición sin `X-Bootstrap-Token` sobre un sistema sin inicializar
- **THEN** el guard la rechaza con `NO_AUTENTICADO`
- **AND** el sistema permanece sin inicializar y sigue siendo inicializable con el secreto correcto

#### Scenario: Secreto incorrecto sobre un sistema ya inicializado
- **WHEN** llega una petición con un `X-Bootstrap-Token` que no coincide, sobre un sistema ya inicializado
- **THEN** el guard la rechaza con `NO_AUTENTICADO`, no con `CONFLICTO`
- **AND** la respuesta no revela que el sistema ya estaba inicializado

#### Scenario: El servidor no tiene secreto configurado
- **WHEN** llega una petición con cualquier valor de `X-Bootstrap-Token` y `BOOTSTRAP_TOKEN` no está configurado
- **THEN** el guard la rechaza con `NO_AUTENTICADO`
- **AND** el motivo queda distinguible en los registros del servidor, sin exponerse en la respuesta

#### Scenario: Un token de sesión no sustituye al secreto
- **WHEN** llega una petición con un `accessToken` válido en `Authorization` pero sin `X-Bootstrap-Token`
- **THEN** el guard la rechaza con `NO_AUTENTICADO`

### Requirement: Marcador de inicialización persistido y de un solo uso
El backend SHALL persistir el estado «inicializado» en una tabla `inicializacion_sistema` que admite **como máximo una fila**, creada por migración y con la unicidad impuesta por la base de datos, no por el código. La operación SHALL insertar el marcador **antes** de crear la cuenta y ambas cosas SHALL ocurrir en la misma transacción. Si el marcador ya existe, la operación MUST rechazarse con `CONFLICTO` **aunque el secreto presentado sea correcto**, sin crear ninguna cuenta. Si la creación de la cuenta falla, la transacción MUST revertirse por completo, dejando el sistema inicializable de nuevo. El backend NO SHALL exponer ninguna operación que elimine el marcador.

#### Scenario: Segunda inicialización con el secreto correcto
- **WHEN** llega una petición con el secreto correcto y un cuerpo válido sobre un sistema ya inicializado
- **THEN** el backend responde `CONFLICTO`
- **AND** no se crea ninguna cuenta ni se altera la cuenta administradora existente

#### Scenario: Peticiones simultáneas sobre un sistema virgen
- **WHEN** dos peticiones válidas con el secreto correcto llegan a la vez sobre un sistema sin inicializar
- **THEN** la restricción de la base de datos hace fallar la inserción del marcador de una de ellas
- **AND** como mucho una cuenta administradora queda creada
- **AND** la perdedora responde `CONFLICTO`

#### Scenario: El alta falla tras reservar el marcador
- **WHEN** el marcador se inserta correctamente pero la creación de la cuenta falla (p. ej. el `email` ya está registrado)
- **THEN** la transacción se revierte por completo
- **AND** el marcador no queda persistido, de modo que el sistema sigue siendo inicializable
- **AND** el intento no consume la única oportunidad de inicialización

#### Scenario: Un sistema ya operativo no queda re-inicializable
- **WHEN** se aplica la migración sobre una base de datos que ya contiene alguna cuenta con rol `administrador`
- **THEN** la migración siembra la fila del marcador
- **AND** el endpoint responde `CONFLICTO` desde el primer arranque de la versión nueva
