# pruebas-e2e-del-backend Specification

## Purpose

Verificación extremo a extremo de los invariantes que **solo se manifiestan con la aplicación completa**: el aislamiento multi-tenant por `owner_id`, el RBAC de administración, el ciclo de sesión con cookie `HttpOnly` y la inicialización de un solo uso. Los tests unitarios cubren cada pieza por separado con dobles; ninguno prueba que el cableado real —token, guards encadenados, servicio y consulta filtrada— las una como se espera.

La suite se ejecuta contra PostgreSQL real, con el esquema creado por las migraciones versionadas, tanto en local como en CI. Su razón de existir es que el paso de integración continua **pueda ponerse en rojo**: antes toleraba la ausencia de pruebas y por tanto aprobaba siempre.

El alcance vigente es el **camino crítico**; extender la cobertura dominio a dominio se apoya en las utilidades que esta capacidad establece.

## Requirements

### Requirement: La suite e2e ejerce la aplicación real
El backend SHALL disponer de una suite de tests extremo a extremo que levante la aplicación completa mediante `AppModule` y la configure con **la misma función de bootstrap que usa `main.ts`**. Esa configuración SHALL vivir en un módulo compartido; los tests NO SHALL replicarla por su cuenta. La suite SHALL ejercer la aplicación por HTTP, sin sustituir guards, pipes, filtros ni repositorios por dobles. Ninguna prueba SHALL depender de servicios externos de red: la capa agéntica se ejecuta en modo `fake` y la validación de API keys BYOK queda desactivada.

#### Scenario: El bootstrap es compartido
- **WHEN** se inspecciona cómo el arranque real y la suite e2e configuran la aplicación
- **THEN** ambos invocan la misma función de configuración
- **AND** un middleware añadido a esa función queda cubierto por la suite sin tocar los tests

#### Scenario: Sin dobles en el camino de la petición
- **WHEN** un test e2e envía una petición HTTP
- **THEN** la atraviesan los guards, el pipe de validación y el filtro de excepciones reales
- **AND** la persistencia ocurre contra PostgreSQL, no contra un repositorio simulado

### Requirement: La suite corre contra PostgreSQL con el esquema de las migraciones
La suite SHALL ejecutarse contra una base de datos PostgreSQL **distinta de la de desarrollo**, cuyo esquema SHALL crearse aplicando las migraciones versionadas y NO con la sincronización automática de TypeORM. La base SHALL crearse automáticamente si no existe. Entre pruebas, el estado SHALL limpiarse vaciando las tablas, preservando la tabla de control de migraciones y los catálogos sembrados por migración. Si no hay base de datos accesible, la suite SHALL fallar; NO SHALL omitirse a sí misma.

#### Scenario: Esquema creado por migraciones
- **WHEN** se ejecuta la suite sobre una base de datos vacía
- **THEN** se aplican las migraciones versionadas antes de la primera prueba
- **AND** una migración rota hace fallar la suite

#### Scenario: Aislamiento entre pruebas
- **WHEN** una prueba crea cuentas, ideas u otros registros
- **THEN** la siguiente prueba parte de un estado limpio
- **AND** los catálogos sembrados por migración siguen disponibles

#### Scenario: Sin base de datos disponible
- **WHEN** se ejecuta la suite sin un PostgreSQL accesible
- **THEN** la ejecución falla de forma explícita
- **AND** no se reporta ningún resultado en verde

### Requirement: El CI ejecuta la suite e2e y puede fallar por ella
El workflow de integración continua SHALL proveer un servicio PostgreSQL al job del backend y ejecutar la suite e2e contra él. El comando de la suite NO SHALL tolerar la ausencia de pruebas: si no hay specs e2e, el paso SHALL fallar. Un fallo de la suite SHALL hacer fallar el job.

#### Scenario: Sin specs e2e
- **WHEN** el CI ejecuta el paso e2e y no existe ninguna spec
- **THEN** el paso falla
- **AND** el falso verde de tolerar la ausencia de pruebas queda descartado

#### Scenario: Una prueba e2e falla
- **WHEN** una prueba de la suite falla en el CI
- **THEN** el job del backend queda en rojo

### Requirement: Cobertura e2e del ciclo de sesión
La suite SHALL verificar el ciclo completo de sesión contra la aplicación real: registro, inicio de sesión con emisión del `accessToken` y de la cookie de refresh, renovación con rotación de esa cookie, y cierre de sesión que la invalida. SHALL verificar también que una petición sin token, o con un token inválido, se rechaza con `NO_AUTENTICADO`.

#### Scenario: Ciclo completo
- **WHEN** una cuenta se registra, inicia sesión, renueva y cierra sesión
- **THEN** el registro devuelve la cuenta con rol `validador`
- **AND** el login entrega un `accessToken` utilizable y establece la cookie de refresh
- **AND** la renovación entrega un `accessToken` nuevo y rota la cookie
- **AND** tras el cierre de sesión, el refresh token anterior deja de ser válido

#### Scenario: Acceso sin credenciales
- **WHEN** se pide un recurso protegido sin token o con un token inválido
- **THEN** la respuesta es `NO_AUTENTICADO`

### Requirement: Cobertura e2e del aislamiento multi-tenant
La suite SHALL verificar con **dos cuentas reales** que los recursos de una no son visibles ni alcanzables por la otra: la colección de un tenant NO SHALL incluir recursos del otro, y el acceso directo a un recurso ajeno por su identificador SHALL rechazarse sin revelar datos del recurso. SHALL verificar además que el `owner_id` se deriva del token y que un `owner_id` enviado por el cliente se ignora.

#### Scenario: La colección solo muestra lo propio
- **WHEN** dos tenants crean cada uno sus recursos y cada uno lista los suyos
- **THEN** cada colección contiene únicamente los recursos de su propietario

#### Scenario: Acceso directo a un recurso ajeno
- **WHEN** un tenant pide por identificador un recurso creado por otro
- **THEN** la respuesta lo rechaza sin exponer ningún dato del recurso

#### Scenario: El `owner_id` del cliente se ignora
- **WHEN** un tenant crea un recurso enviando un `owner_id` que no es el suyo
- **THEN** el recurso queda bajo el `owner_id` derivado de su token
- **AND** el otro tenant sigue sin verlo

### Requirement: Cobertura e2e del RBAC de administración
La suite SHALL verificar que las operaciones de administración de cuentas exigen el rol `administrador`: una cuenta `validador` autenticada SHALL recibir `ACCESO_DENEGADO` en todas ellas, y una cuenta `administrador` SHALL poder ejecutarlas.

#### Scenario: Un validador no administra
- **WHEN** una cuenta con rol `validador` invoca las operaciones de administración de cuentas
- **THEN** todas responden `ACCESO_DENEGADO`

#### Scenario: Un administrador administra
- **WHEN** una cuenta con rol `administrador` lista las cuentas del sistema
- **THEN** la operación responde correctamente

### Requirement: Cobertura e2e de la inicialización del sistema
La suite SHALL verificar el arranque operativo contra la aplicación real: sin el secreto de despliegue o con uno incorrecto la inicialización se rechaza con `NO_AUTENTICADO`; con el secreto correcto crea la cuenta con rol `administrador`; y un segundo intento se rechaza con `CONFLICTO` **aunque el secreto sea correcto**. SHALL verificar que el registro público sigue asignando `validador` después de inicializar.

#### Scenario: Inicialización y repetición
- **WHEN** se inicializa un sistema virgen con el secreto correcto y se repite la operación
- **THEN** la primera llamada crea la cuenta con rol `administrador`
- **AND** la segunda responde `CONFLICTO` pese a presentar el mismo secreto válido

#### Scenario: Sin el secreto correcto
- **WHEN** se intenta inicializar sin la cabecera del secreto o con un valor incorrecto
- **THEN** la respuesta es `NO_AUTENTICADO`
- **AND** el sistema permanece sin inicializar

#### Scenario: El registro público no se ve afectado
- **WHEN** se registra una cuenta por la vía pública tras inicializar el sistema
- **THEN** la cuenta creada tiene rol `validador`
