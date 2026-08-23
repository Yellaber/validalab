## 1. Configuración del entorno

- [x] 1.1 Añadir `BOOTSTRAP_TOKEN` a `src/config/env.schema.ts`: **opcional**, con mínimo de 32 caracteres cuando está presente, y comentario explicando por qué no es obligatorio (no romper despliegues ya inicializados)
- [x] 1.2 Exponerlo en `AppConfigService` como `get bootstrap(): { token?: string }`, coherente con los demás getters agrupados
- [x] 1.3 Documentarlo en `.env.example`: para qué sirve, cómo generarlo (`openssl rand -hex 32`), que solo aplica antes de inicializar y que puede retirarse después
- [x] 1.4 Spec de configuración: verificar que la ausencia de la variable no impide arrancar y que un valor corto se rechaza

## 2. Persistencia — marcador de inicialización

- [x] 2.1 Entidad `InicializacionSistema` (`src/sistema/inicializacion.entity.ts`), tabla `inicializacion_sistema`: `id` (PK entera fijada a 1), `ejecutado_en` (timestamptz), `version` (varchar), `admin_email` (varchar)
- [x] 2.2 Migración `CrearInicializacionSistema`: crea la tabla con `PRIMARY KEY (id)` y `CHECK (id = 1)`, comentando que la fila única es lo que arbitra la carrera entre llamadas simultáneas
- [x] 2.3 En la misma migración, **sembrar el marcador si ya existe alguna cuenta con rol `administrador`**, usando el email del administrador más antiguo, para que un sistema ya operativo no quede re-inicializable
- [x] 2.4 `down` que elimina la tabla
- [x] 2.5 Verificar `run` / `revert` / `run` contra PostgreSQL en Docker, incluida la rama de siembra (con y sin administrador previo)

## 3. Guard del secreto de despliegue

- [x] 3.1 `BootstrapTokenGuard` (`src/sistema/bootstrap-token.guard.ts`): lee `X-Bootstrap-Token`, la compara con `AppConfigService` y lanza `NoAutenticadoException` en todos los casos de fallo
- [x] 3.2 Comparación en **tiempo constante** con `crypto.timingSafeEqual`, con la comprobación de longitud aparte (`timingSafeEqual` lanza si difieren) y sin cortocircuitar
- [x] 3.3 Si `BOOTSTRAP_TOKEN` no está configurado, rechazar **toda** petición: el fallo por defecto es denegar
- [x] 3.4 Distinguir en los **logs** «sin secreto configurado» de «secreto no coincide», devolviendo al cliente el mismo `401` genérico en ambos casos
- [x] 3.5 El guard **no** inspecciona `Authorization`, de modo que un `accessToken` válido nunca sustituye al secreto
- [x] 3.6 Specs del guard: sin cabecera, cabecera incorrecta, servidor sin secreto, `accessToken` presente sin secreto, y camino feliz

## 4. Alta reutilizada en `usuarios`

- [x] 4.1 Extraer de `UsuariosService.registrar` el alta común a un helper privado (normalización de email, hashing, `create`, manejo de la violación única) sin cambiar su comportamiento
- [x] 4.2 Añadir `crearAdministradorInicial(datos, manager?)` que delega en ese helper con rol `administrador`, aceptando el `EntityManager` de la transacción
- [x] 4.3 **No** añadir un parámetro `rol` a `registrar`: el camino del endpoint público debe quedar incapaz de producir un `administrador`
- [x] 4.4 Exportar `UsuariosService` desde `UsuariosModule` para que `SistemaModule` pueda inyectarlo
- [x] 4.5 Specs: `registrar` sigue devolviendo `validador`; `crearAdministradorInicial` devuelve `administrador`; ambos comparten normalización y hashing

## 5. Módulo `sistema`

- [x] 5.1 `SistemaService.inicializar(datos)`: abre transacción, **inserta primero el marcador**, luego crea la cuenta, confirma
- [x] 5.2 Traducir la violación de clave primaria del marcador a `ConflictoException` — el `409` lo decide el marcador, nunca el secreto
- [x] 5.3 Garantizar que un fallo en el alta revierte también el marcador, dejando el sistema inicializable
- [x] 5.4 `SistemaController` con `POST /sistema/inicializar`, `@Publico()` (con comentario: aquí significa «no autenticado por JWT», no «abierto») y `@UseGuards(BootstrapTokenGuard)`
- [x] 5.5 DTOs Zod: petición con las mismas reglas que `RegistroUsuarioDto`; respuesta reutilizando `UsuarioRespuestaDto`
- [x] 5.6 `SistemaModule` con `TypeOrmModule.forFeature([InicializacionSistema])`, importando `UsuariosModule`; `AppModule` lo importa
- [x] 5.7 Specs del service: camino feliz, ya inicializado con secreto correcto → `CONFLICTO`, rollback cuando falla el alta

## 6. Documentación de API

- [x] 6.1 Registrar el `securityScheme` `bootstrapToken` (`apiKey` en cabecera `X-Bootstrap-Token`) en `src/swagger/configurar-swagger.ts`
- [x] 6.2 Añadir el `tag` `sistema` con la misma acotación que el contrato: ciclo de vida de la instalación, no dominio
- [x] 6.3 Documentar el endpoint con `@ApiTags`/`@ApiOperation`/`@Api*Response` y los tres bordes (`401`, `409`, `422`) como `ErrorRespuestaDto`

## 7. Documentación de operación

- [x] 7.1 Añadir al `README.md` la secuencia real de puesta en marcha: `docker compose up -d` → `migration:run` → arrancar → `POST /sistema/inicializar` con el secreto → iniciar sesión. Hoy no está escrita en ningún sitio y es el motivo original de este trabajo
- [x] 7.2 Señalar en esa sección que conviene promover a un **segundo administrador** con `PATCH /usuarios/{id}/rol` en cuanto se entra, porque no hay recuperación si se pierde el acceso al único

## 8. Verificación

- [x] 8.1 `npm run lint` sin hallazgos y `npm run build` limpio
- [x] 8.2 `npm test` en verde, sin regresiones sobre las 37 suites / 251 tests existentes
- [x] 8.3 Verificar la cobertura de los **nueve escenarios** de la capacidad `sistema` de la raíz, que es la fuente de verdad del comportamiento observable
- [x] 8.4 Comprobar contra el backend en marcha: inicializar con secreto correcto → `201`; repetir → `409`; sin cabecera → `401`; cuerpo inválido → `422`
- [x] 8.5 Confirmar que `POST /usuarios/registro` sigue devolviendo `validador` después de inicializar
- [x] 8.6 Revisar el diff: `contrato-api/openapi.yaml` **no** aparece — este change implementa el contrato, no lo modifica
- [x] 8.7 `openspec validate --strict` sobre el change
