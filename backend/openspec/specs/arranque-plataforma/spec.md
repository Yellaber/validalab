# arranque-plataforma Specification

## Purpose
TBD - created by archiving change fundacion-e0. Update Purpose after archive.
## Requirements
### Requirement: Configuración por entorno validada al arranque
El sistema SHALL cargar su configuración desde el entorno y validarla al arrancar. Si falta o es inválida cualquier variable obligatoria (cadena de conexión PostgreSQL, secreto JWT, TTLs de token), el proceso SHALL abortar el arranque con un error descriptivo y NO SHALL atender peticiones. La configuración SHALL consumirse mediante un servicio tipado; el código de dominio NO SHALL leer `process.env` directamente.

#### Scenario: Falta una variable obligatoria
- **WHEN** se inicia el backend sin la variable de conexión a PostgreSQL definida
- **THEN** el proceso termina durante el arranque con un mensaje que identifica la variable faltante
- **AND** no se abre ningún puerto de escucha

#### Scenario: Entorno completo y válido
- **WHEN** se inicia el backend con todas las variables obligatorias presentes y válidas
- **THEN** la aplicación arranca y expone su configuración a través del servicio de configuración tipado

### Requirement: Persistencia PostgreSQL gobernada por migraciones
El sistema SHALL conectarse a PostgreSQL mediante TypeORM con repositorios inyectables. El esquema de base de datos SHALL gobernarse exclusivamente con migraciones de TypeORM versionadas. La sincronización automática de esquema (`synchronize`) NO SHALL estar activa fuera de un arranque local desechable habilitado explícitamente por entorno. Debe existir un `DataSource` utilizable tanto por la aplicación como por la CLI de migraciones.

#### Scenario: Conexión disponible al arrancar
- **WHEN** la aplicación arranca con una base de datos PostgreSQL accesible
- **THEN** establece la conexión vía TypeORM y los repositorios quedan disponibles para inyección

#### Scenario: Migraciones como fuente de verdad
- **WHEN** se aplica el cambio de esquema mediante el comando de migraciones
- **THEN** el esquema resultante queda determinado por las migraciones versionadas
- **AND** la aplicación no altera el esquema por sí misma en entornos no locales

### Requirement: Validación de DTOs HTTP con Zod
El sistema SHALL validar la entrada de toda petición HTTP contra esquemas Zod mediante un pipe de validación global (`nestjs-zod`). La entrada que no cumpla su esquema SHALL rechazarse con código `VALIDACION_FALLIDA` e incluir el detalle de los campos inválidos.

#### Scenario: Payload inválido
- **WHEN** llega una petición cuyo cuerpo no cumple el esquema Zod del DTO
- **THEN** la petición se rechaza con `VALIDACION_FALLIDA`
- **AND** la respuesta enumera, campo a campo, qué falló

#### Scenario: Payload válido
- **WHEN** llega una petición cuyo cuerpo cumple el esquema Zod del DTO
- **THEN** la petición continúa hacia el manejador con los datos ya validados y tipados

