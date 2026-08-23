## ADDED Requirements

### Requirement: Verificación de JWT en operaciones protegidas
El sistema SHALL exigir, por defecto, un `accessToken` JWT válido en el encabezado `Authorization: Bearer <token>` para toda operación. Un guard global SHALL verificar firma y expiración del token. Las rutas que el contrato marca como públicas (`security: []`, p. ej. registro, login, refresh) SHALL marcarse explícitamente como públicas y quedar exentas. Un token ausente, malformado, con firma inválida o expirado SHALL producir `401 NO_AUTENTICADO`.

#### Scenario: Petición protegida sin token
- **WHEN** se invoca una operación protegida sin encabezado `Authorization`
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`

#### Scenario: Token inválido o expirado
- **WHEN** se invoca una operación protegida con un token de firma inválida o expirado
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`

#### Scenario: Ruta pública
- **WHEN** se invoca una ruta marcada como pública (login/registro/refresh) sin token
- **THEN** el guard permite el paso sin exigir autenticación

### Requirement: Derivación del owner_id desde el token
El sistema SHALL derivar el `owner_id` del usuario autenticado exclusivamente de los claims del token verificado (claim `sub`). El sistema NO SHALL aceptar `owner_id` como entrada del cliente (cuerpo, query o ruta). El `owner_id` y los claims relevantes (p. ej. `rol`) SHALL quedar disponibles para la capa de dominio mediante un mecanismo único (decorador de parámetro), de modo que ningún servicio obtenga el `owner_id` de otra fuente.

#### Scenario: owner_id tomado del token
- **WHEN** una operación protegida se ejecuta con un token válido
- **THEN** el `owner_id` expuesto a la capa de dominio es el del claim `sub` del token

#### Scenario: owner_id del cliente ignorado
- **WHEN** una petición incluye un `owner_id` en su cuerpo o query
- **THEN** ese valor se ignora y solo se usa el derivado del token

### Requirement: Aislamiento multi-tenant ante recursos ajenos
El sistema SHALL impedir el acceso a recursos que no pertenezcan al `owner_id` del solicitante. El acceso a un recurso de otro `owner_id` SHALL producir `403 ACCESO_DENEGADO` sin revelar los datos del recurso. La fundación SHALL proveer la excepción semántica y la convención para que cada repositorio de dominio filtre por `owner_id`.

#### Scenario: Acceso a recurso de otro usuario
- **WHEN** un usuario autenticado solicita un recurso perteneciente a otro `owner_id`
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`
- **AND** no se incluye dato alguno del recurso solicitado
