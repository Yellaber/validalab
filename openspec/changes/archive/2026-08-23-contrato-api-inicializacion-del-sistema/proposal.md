## Why

El contrato define cuatro operaciones reservadas al rol `administrador` —listar cuentas, consultar una cuenta, cambiar rol, cambiar estado— y un registro público que **siempre** crea la cuenta con rol `validador`. Ninguna otra ruta produce un `administrador`.

Encadenadas, ambas reglas dejan un sistema recién desplegado en un punto muerto:

1. Se despliega el backend contra una base de datos migrada y vacía.
2. La primera persona se registra: obtiene `validador`, como manda el contrato.
3. `PATCH /usuarios/{id}/rol` la promovería a `administrador`… pero esa ruta exige ya serlo.

El requisito «Gestión de cuentas y roles por administrador» presupone un administrador que el contrato nunca explica cómo llega a existir. Hoy el único escape es un `UPDATE` manual sobre Postgres —fuera del contrato, fuera de la API y fuera de toda traza—, lo que convierte esas cuatro operaciones en **inalcanzables** para quien solo dispone de la API.

Se cierra ahora porque es lo último que separa al MVP publicado (v0.1.0) de un sistema que se puede poner en marcha sin tocar la base de datos a mano.

## What Changes

- **Nuevo endpoint `POST /sistema/inicializar`**: crea la cuenta administradora del sistema y deja el sistema marcado como inicializado, en una sola operación. Es el origen del rol `administrador`, y el único.
- **De un solo uso.** Una vez inicializado, toda llamada posterior responde `409 CONFLICTO`, sea cual sea el token presentado. El estado «inicializado» es permanente y no se revierte por API: no existe una ruta para des-inicializar el sistema.
- **Protegido por un secreto de despliegue.** Nuevo `securityScheme` `bootstrapToken` (`apiKey` en la cabecera `X-Bootstrap-Token`), cuyo valor fija el operador en el entorno del despliegue. Ausente o incorrecto → `401 NO_AUTENTICADO`. Sin este requisito el endpoint sería una carrera abierta: entre el instante en que la API queda expuesta y el instante en que el operador la llama, cualquiera podría reclamar el administrador del sistema — y el candado de un solo uso haría esa pérdida irreversible.
- **`POST /usuarios/registro` no cambia.** Sigue siendo público y sigue asignando `validador` a toda cuenta que crea, antes y después de la inicialización. Las dos rutas quedan deliberadamente separadas: una es la puerta de los usuarios, la otra es la puesta en marcha de la instalación.
- **Nuevo `tag` `sistema`** para las operaciones de ciclo de vida de la instalación. Es el primer `tag` que no corresponde a un módulo de dominio, y por ahora contiene una sola operación.
- La respuesta exitosa devuelve el recurso `Usuario` ya creado, con `rol: administrador` y `estado: activo`, **sin sesión ni tokens**: el administrador inicia sesión después por `POST /usuarios/login` como cualquier otra cuenta.

No se añaden códigos de error: `NO_AUTENTICADO`, `CONFLICTO` y `VALIDACION_FALLIDA` ya están en el catálogo `CodigoError` y cubren los tres bordes.

**Fuera de alcance**: un panel de administración por API; degradar un `administrador` a `validador` (ya lo cubre `PATCH /usuarios/{id}/rol` en cuanto existe el primero); recuperar el acceso si se pierde la cuenta administradora; y sembrar datos iniciales distintos de esa cuenta —el catálogo de modelos y la tabla de precios ya se siembran en sus propias migraciones.

## Capabilities

### New Capabilities
- `sistema`: ciclo de vida de la instalación en el contrato — la inicialización de un sistema virgen, de un solo uso y protegida por un secreto de despliegue, que produce la primera y única cuenta administradora de origen, sin la cual las operaciones de administración son inalcanzables.

### Modified Capabilities
<!-- Ninguna. `usuarios` se mantiene intacto: el registro sigue siendo público y sigue asignando `validador`. Este change no altera ese requisito, sino que explica el origen del administrador que la gestión de cuentas ya presuponía. -->

## Impact

- **`contrato-api/openapi.yaml`**: nuevo `tag` `sistema`, nuevo `securityScheme` `bootstrapToken`, nueva ruta `POST /sistema/inicializar` y el esquema de su petición. Reutiliza `Usuario`, `Error` y las respuestas `NoAutenticado` / `Conflicto` / `ValidacionFallida` ya existentes. **Ningún código de error nuevo y ningún endpoint modificado.**
- **`CLAUDE.md` (raíz) y `README.md`**: ambos enumeran los `tags` del contrato como los módulos de dominio (`usuarios`, `ideas`, `contactos`, `entrevistas`, `kpis`, `agente`, `proveedores`). Esa enumeración queda incompleta y debe incluir `sistema`.
- **Backend** (change siguiente, `inicializacion-del-sistema`): módulo `sistema` con el endpoint, un marcador de inicialización persistido que decide el `409` y resuelve la carrera entre llamadas simultáneas, y el secreto del despliegue validado al arranque como el resto de la configuración. **Este change no incluye código de runtime.**
- **Frontend**: sin impacto. La inicialización es una operación de despliegue, no una pantalla del cliente; el administrador entra después por el login normal.
- **Operación**: la puesta en marcha pasa de «migrar, registrarse y tocar Postgres a mano» a «migrar y hacer una llamada autenticada por el secreto del despliegue».
