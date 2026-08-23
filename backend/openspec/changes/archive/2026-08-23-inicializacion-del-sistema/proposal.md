## Why

El contrato ya define `POST /sistema/inicializar` —el origen único del rol `administrador`, de un solo uso y protegido por un secreto de despliegue— pero el backend no lo implementa. Mientras tanto, el sistema sigue sin poder ponerse en marcha por API: `UsuariosService.registrar` asigna `validador` sin excepción, y las cuatro operaciones `@Roles('administrador')` de `usuarios.controller.ts` siguen siendo inalcanzables salvo con un `UPDATE` manual sobre Postgres.

Este change cierra esa distancia. Es la implementación del último requisito que separa al MVP publicado (v0.1.0) de un despliegue que se pone en marcha sin tocar la base de datos a mano.

## What Changes

- **Módulo `sistema`** (nuevo, RNF-10): el primer módulo del backend que no modela un dominio del SRS, sino el ciclo de vida de la instalación. Contiene el controller, el service, la entidad del marcador y el guard del secreto.
- **`POST /sistema/inicializar`**: marcado `@Publico()` para saltar el `JwtAuthGuard` global —no hay contra quién autenticarse todavía— y protegido en su lugar por un guard propio que exige la cabecera `X-Bootstrap-Token`.
- **Entidad `InicializacionSistema`** (tabla `inicializacion_sistema`, fila única): el marcador que decide el `409` y, sobre todo, **el árbitro de la carrera**. Dos peticiones simultáneas sobre un sistema virgen no pueden decidirse con una comprobación en memoria: ambas leerían «vacío». La unicidad la impone Postgres y la violación se traduce a `409 CONFLICTO`.
- **Migración** que crea la tabla y **siembra el marcador si ya existe algún `administrador`**: un sistema que hoy opera con una cuenta promovida a mano no debe quedar re-inicializable al desplegar esta versión.
- **`BOOTSTRAP_TOKEN`** incorporado al esquema Zod del entorno y expuesto por `AppConfigService`, como el resto de la configuración. Ningún código de dominio lee `process.env`.
- **Alta reutilizada, no duplicada**: la creación de la cuenta pasa por el mismo camino que `UsuariosService.registrar` —normalización de email, hashing, control de email duplicado—, y difiere solo en el rol resultante. El hashing y las invariantes de cuenta siguen viviendo en un único sitio.
- **Swagger**: el `securityScheme` `bootstrapToken` registrado en `configurar-swagger.ts` y el endpoint documentado con DTOs Zod, como el resto.

**Fuera de alcance**: panel de administración por API; recuperación de la cuenta administradora si se pierde el acceso; cualquier cambio en `POST /usuarios/registro`, que sigue público y sigue asignando `validador`; y la retirada del secreto del entorno tras la inicialización (queda como nota de operación, no como código).

## Capabilities

### New Capabilities
- `inicializacion-del-sistema`: implementación en runtime del arranque operativo — el endpoint protegido por el secreto de despliegue, el marcador persistido que lo vuelve de un solo uso y resuelve la concurrencia en la base de datos, y la creación de la cuenta administradora de origen reutilizando el alta de cuentas existente.

### Modified Capabilities
<!-- Ninguna. `registro-de-cuenta` no cambia (el registro sigue asignando `validador`) y `arranque-plataforma` tampoco: añadir una variable opcional al esquema del entorno no altera su requisito de validación fail-fast, que ya cubre cualquier variable que el esquema declare. -->

## Impact

- **Código**: nuevo `src/sistema/` (módulo, controller, service, entidad, guard, DTOs y specs). `AppModule` importa `SistemaModule`. `src/config/env.schema.ts` y `src/config/app-config.service.ts` ganan el secreto. `src/swagger/configurar-swagger.ts` gana el `securityScheme` y el `tag`. `UsuariosModule` expone el alta que `sistema` reutiliza.
- **Persistencia**: una migración nueva — tabla `inicializacion_sistema` con unicidad de fila única, más la siembra condicional del marcador para sistemas que ya operan con administrador.
- **Contrato**: **no lo toca**. Este change implementa lo ya definido en `contrato-api/openapi.yaml`; la capacidad `sistema` de la raíz es su fuente de verdad.
- **Operación**: `.env.example` documenta `BOOTSTRAP_TOKEN`, y el `README` gana la secuencia real de puesta en marcha (migrar → inicializar → iniciar sesión), que hoy no está escrita en ningún sitio.
- **Frontend**: sin impacto. La inicialización es una operación de despliegue, no una pantalla del cliente.
- **Sin dependencias nuevas.** El guard usa `node:crypto`, ya disponible.
