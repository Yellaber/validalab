## 1. Dependencias y entorno

- [x] 1.1 Instalar `bcryptjs` (+ `@types/bcryptjs`) como librería de hashing
- [x] 1.2 Extender el esquema Zod de entorno con `REFRESH_TOKEN_TTL` (y `JWT_REFRESH_*` solo si se opta por JWT de refresh); actualizar `.env.example`
- [x] 1.3 Ampliar el `JwtModule` de `AuthModule` con `signOptions` (expiración desde `JWT_ACCESS_TTL`) para poder FIRMAR accessTokens

## 2. Persistencia (entidades y migraciones)

- [x] 2.1 Entidad `Usuario` (TypeORM): `id` uuid, `email` único (normalizado a minúsculas), `nombre`, `passwordHash` (no serializable), `rol`, `estado`, `fechaCreacion`
- [x] 2.2 Entidad `Sesion` (refresh tokens): `id`, `usuarioId`, `tokenHash`, `expiraEn`, `revocadoEn`, índice por `usuarioId` (+ único en `tokenHash`, FK a usuarios ON DELETE CASCADE)
- [x] 2.3 Migración para las tablas `usuarios` y `sesiones`; verificado `migration:run`/`revert`/`show` contra PostgreSQL (Docker)

## 3. Servicios de soporte

- [x] 3.1 `ServicioDeHashing` (interfaz `hash`/`verificar`) con la implementación elegida, aislado tras la interfaz
- [x] 3.2 `ServicioDeTokens`: firma el accessToken (claims `{ sub, rol }`, `expiraEn` = TTL en segundos) y genera/rota/valida refresh tokens opacos (hash en BD)
- [x] 3.3 Tests unitarios del hashing (hash ≠ plano, verificar ok/falla) y de tokens (rotación invalida el anterior; refresh inválido/expirado/revocado rechazado)

## 4. DTOs y mapeo (Zod + contrato)

- [x] 4.1 DTOs con `createZodDto`: `RegistroUsuarioDto`, `LoginDto`, `RefrescarTokenDto`, `ActualizarPerfilDto` (límites del contrato: password ≥ 8, nombre ≥ 1, email)
- [x] 4.2 Mapeador `aUsuarioDto(entidad)` que produce el recurso `Usuario` del contrato SIN `passwordHash`
- [x] 4.3 Tipo/forma de `TokenRespuesta` (`accessToken`, `refreshToken`, `tokenTipo: 'Bearer'`, `expiraEn`, `usuario`)

## 5. Registro (registro-de-cuenta)

- [x] 5.1 `UsuariosService.registrar`: normaliza email, hashea password, crea con rol `validador`/estado `activo`; email duplicado → `ConflictoException`
- [x] 5.2 `POST /usuarios/registro` (`@Publico`): 201 `Usuario`
- [x] 5.3 Tests: registro válido (datos + sin hash), email duplicado (pre-chequeo y carrera 23505 → 409), recurso sin credencial. _(201 HTTP y 422 de validación: capa HTTP, verificados end-to-end en 8.2.)_

## 6. Autenticación de sesión (autenticacion-de-sesion)

- [x] 6.1 `login`: valida credenciales (verificación de hash), bloquea `suspendido`, emite `TokenRespuesta` (crea sesión); credenciales inválidas → 401 sin distinguir
- [x] 6.2 `refresh`: valida el refresh (hash + vigente + no revocado), **rota** y emite `TokenRespuesta` nuevo; inválido/expirado/revocado → 401
- [x] 6.3 `logout` (autenticado): revoca la sesión del refresh presentado → 204
- [x] 6.4 Endpoints: `POST /usuarios/login` y `/refresh` (`@Publico`, `@HttpCode(200)`), `POST /usuarios/logout` (protegido, `@HttpCode(204)`)
- [x] 6.5 Tests: login ok/credenciales inválidas/email inexistente/suspendido; refresh ok (rota a RT2)/inválido/suspendido; logout revoca. _(refresh nunca en claro: cubierto por token.service.spec, grupo 3.)_

## 7. Perfil propio (perfil-propio)

- [x] 7.1 `GET /usuarios/yo` (protegido): resuelve el usuario por `@OwnerId()`; 200 `Usuario`
- [x] 7.2 `PATCH /usuarios/yo` (protegido): actualiza solo `nombre`; `rol`/`estado` no se tocan (el DTO no los admite); 200 `Usuario`
- [x] 7.3 Tests: perfil propio (aislamiento por `owner_id`), cuenta inexistente→401, PATCH solo-nombre, rol/estado ignorados. _(sin token→401 y nombre vacío→422: capa HTTP, verificados en 8.2.)_

## 8. Cableado y verificación final

- [x] 8.1 Crear `UsuariosModule` (controlador, servicio, `ServicioDeHashing`/`ServicioDeTokens`, `forFeature([Usuario, Sesion])`, importa `AuthModule`) e importarlo en `AppModule`
- [x] 8.2 Verificado el flujo completo contra la BD (Docker): registro→login→`/yo`→refresh→logout, con 401/409/**422** conforme al contrato
- [x] 8.3 `npm run lint` y `npm test` en verde (56 tests; incluye el test de aislamiento `/yo`). Además: fix `VALIDACION_FALLIDA`→422 para conformidad con el contrato
- [x] 8.4 Verificar el change con la skill de OpenSpec antes de archivar (sin issues críticos; cierra el test de aislamiento pendiente de la fundación)
