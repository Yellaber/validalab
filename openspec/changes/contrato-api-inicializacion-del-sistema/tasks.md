## 1. Preparación

- [x] 1.1 Confirmar en `contrato-api/openapi.yaml` la forma de `POST /usuarios/registro` (`security: []`, cuerpo `RegistroUsuarioRequest`, respuestas `201`/`409`/`422`) para redactar la inicialización en simetría
- [x] 1.2 Confirmar que `NO_AUTENTICADO`, `CONFLICTO` y `VALIDACION_FALLIDA` ya están en el catálogo `CodigoError` y que existen las respuestas reutilizables `NoAutenticado`, `Conflicto` y `ValidacionFallida`
- [x] 1.3 Confirmar que el requisito «Gestión de cuentas y roles por administrador» no cambia, de modo que `usuarios` no necesita delta

## 2. Contrato — `tag` y esquema de seguridad

- [x] 2.1 Añadir el `tag` `sistema` a la lista de `tags`, acotando su descripción a operaciones de **ciclo de vida de la instalación** (no de dominio), para que no degenere en cajón de sastre
- [x] 2.2 Añadir el `securityScheme` `bootstrapToken` (`type: apiKey`, `in: header`, `name: X-Bootstrap-Token`) junto a `bearerAuth` y `refreshCookie`
- [x] 2.3 Documentar en su `description` que el valor lo fija el operador en el entorno del despliegue, que solo sirve mientras el sistema no esté inicializado y que puede retirarse después

## 3. Contrato — `POST /sistema/inicializar`

- [x] 3.1 Añadir la ruta con `tags: [sistema]`, `operationId: inicializarSistema` y `security: [{ bootstrapToken: [] }]` — **no** `security: []`, para que el documento declare su propia protección
- [x] 3.2 Definir el esquema de petición (`email`, `nombre`, `password`) con las mismas reglas de validación que `RegistroUsuarioRequest`
- [x] 3.3 Definir la respuesta `201` como el recurso `Usuario`, dejando explícito en la `description` que llega con `rol: administrador` y `estado: activo` y **sin** `accessToken` ni cookie de sesión
- [x] 3.4 Cablear las respuestas `401` (`NoAutenticado`), `409` (`Conflicto`) y `422` (`ValidacionFallida`) reutilizando los componentes existentes
- [x] 3.5 Redactar la `description` del endpoint declarando las tres reglas que no se leen del esquema: es el **único** origen del rol `administrador`; es de **un solo uso** y el `409` aplica aunque el secreto sea correcto; **no existe** operación de reversa
- [x] 3.6 Verificar que `POST /usuarios/registro` queda intacto en el diff

## 4. Documentación afectada

- [x] 4.1 Añadir `sistema` a la enumeración de `tags` del `CLAUDE.md` raíz (sección «Contrato de API»), señalando que es el único que no corresponde a un módulo de dominio
- [x] 4.2 Añadir `sistema` a la enumeración de `tags` del `README.md` (sección «Contrato de API»)

## 5. Verificación

- [x] 5.1 Comprobar que el recuento de problemas de `redocly lint` no empeora respecto a `develop`
- [x] 5.2 Revisar el diff: un `tag`, un `securityScheme`, una ruta y su esquema de petición; ningún endpoint existente modificado y ningún código de error nuevo
- [x] 5.3 Ejecutar `openspec validate --strict` sobre el change
- [x] 5.4 Verificar que cada escenario del delta `sistema` tiene reflejo en el contrato: los tres bordes (`401` sin secreto y con secreto incorrecto, `409` ya inicializado, `422` payload inválido) y la ausencia de reversa
- [x] 5.5 Confirmar que el change **no** introduce código de runtime: el diff toca solo `contrato-api/openapi.yaml`, los dos documentos de la tarea 4 y los artefactos del change
