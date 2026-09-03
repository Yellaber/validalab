## ADDED Requirements

### Requirement: Los atributos de la cookie de sesión dependen de la topología del despliegue
El sistema SHALL leer del entorno el atributo `SameSite` de la cookie de refresh, con `strict` como valor por defecto. NO SHALL fijarlo en código, porque el valor correcto depende de si el frontend y el backend comparten sitio registrable, y eso lo determina el despliegue y no la aplicación.

La emisión y la limpieza de la cookie SHALL usar el **mismo** valor. Los demás atributos —`HttpOnly`, `Path` acotado a las rutas de sesión y vigencia igual al TTL del refresh token— NO SHALL cambiar: siguen fijados en código.

#### Scenario: Despliegue en sitios distintos
- **WHEN** el backend se configura con `SameSite=None` y arranca
- **THEN** la `Set-Cookie` de login y de refresh incluye `SameSite=None; Secure`
- **AND** el navegador la adjunta a `POST /usuarios/refresh` desde el origen del frontend, aunque sea otro sitio registrable

#### Scenario: Valor por defecto sin configurar
- **WHEN** el backend arranca sin la variable de `SameSite` definida
- **THEN** la cookie se emite con `SameSite=Strict`, el comportamiento previo a esta capacidad

#### Scenario: Cierre de sesión con la cookie efectivamente borrada
- **WHEN** se hace `POST /usuarios/logout` en un despliegue configurado con `SameSite=None`
- **THEN** la cabecera que limpia la cookie declara los mismos `SameSite`, `Path`, `Secure` y `HttpOnly` con los que se emitió
- **AND** el navegador la elimina

### Requirement: Una configuración de cookie incoherente aborta el arranque
El sistema SHALL rechazar al arrancar la combinación `SameSite=None` con la marca `Secure` desactivada, con un error que identifique ambas variables. NO SHALL arrancar con esa configuración.

Es una regla que ninguna variable puede comprobar por separado, y su modo de fallo sin validación es el más caro de diagnosticar del despliegue: el navegador descarta en silencio la cookie sin `Secure`, y la sesión se cae sola cuando expira el `accessToken`, muy después de un arranque aparentemente correcto.

#### Scenario: Combinación incoherente
- **WHEN** se arranca el backend con `SameSite=None` y la marca `Secure` en `false`
- **THEN** el proceso aborta el arranque con un mensaje que nombra las dos variables y explica la incompatibilidad
- **AND** no se abre ningún puerto de escucha

#### Scenario: Combinación válida de desarrollo
- **WHEN** se arranca el backend con `SameSite=Strict` y la marca `Secure` en `false`, la configuración de desarrollo local sobre `http`
- **THEN** el arranque procede con normalidad

### Requirement: Conexión cifrada a la base de datos gestionada
El sistema SHALL poder conectarse a PostgreSQL sobre TLS según una variable de entorno, desactivada por defecto para no romper el PostgreSQL local de desarrollo, que no lo ofrece. La opción SHALL cablearse en el **único** constructor de opciones de TypeORM, de modo que la aplicación y la CLI de migraciones vean la misma configuración.

El nivel garantizado es **cifrado en tránsito**; esta capacidad NO SHALL exigir verificación de la cadena de certificación, que requeriría distribuir y rotar el certificado raíz del proveedor.

#### Scenario: Base de datos gestionada que exige TLS
- **WHEN** el backend arranca con la opción de SSL activada contra un PostgreSQL gestionado
- **THEN** la conexión se establece y los repositorios quedan disponibles

#### Scenario: Desarrollo local sin TLS
- **WHEN** el backend arranca sin definir la opción de SSL, contra el PostgreSQL de `docker-compose.yml`
- **THEN** la conexión se establece sin TLS, igual que antes de esta capacidad

#### Scenario: Misma configuración para migraciones
- **WHEN** se ejecuta la CLI de migraciones con la opción de SSL activada
- **THEN** la CLI se conecta con las mismas opciones de conexión que usaría la aplicación

### Requirement: El cliente conoce el origen absoluto del backend
La build de producción del frontend SHALL dirigir sus peticiones al **origen absoluto** del backend desplegado. NO SHALL asumir mismo origen ni un prefijo de proxy inverso, porque en esta topología el frontend es un artefacto estático servido desde otro sitio.

Las rutas resultantes SHALL seguir casando con el `Path` de la cookie de sesión: el prefijo de proxy que hoy se antepone lo impediría.

#### Scenario: Petición autenticada desde la build de producción
- **WHEN** la aplicación desplegada llama a un endpoint protegido
- **THEN** la petición sale hacia el origen del backend desplegado, con credenciales

#### Scenario: Renovación de sesión
- **WHEN** la aplicación desplegada llama a `POST /usuarios/refresh`
- **THEN** la ruta cae bajo el `Path` con el que se emitió la cookie y el navegador la adjunta

#### Scenario: Desarrollo local intacto
- **WHEN** se ejecuta el servidor de desarrollo del frontend
- **THEN** sigue apuntando al backend local, sin cambios respecto al comportamiento previo

### Requirement: El backend se distribuye como imagen de contenedor sin dependencias de desarrollo
El backend SHALL disponer de una imagen de contenedor construida en varias etapas: una que compila con el árbol completo de dependencias y otra, final, que solo contiene el artefacto compilado y las dependencias de producción. El proceso SHALL ejecutarse con un usuario sin privilegios.

La imagen SHALL tomar el puerto de escucha del entorno, sin fijarlo, porque la plataforma lo asigna. El `CMD` de la imagen SHALL limitarse a arrancar la aplicación: cualquier puesta al día del esquema es responsabilidad del arranque de la aplicación, no de un comando distinto en la imagen.

#### Scenario: Arranque en la plataforma
- **WHEN** la plataforma arranca el contenedor con su puerto en el entorno y la configuración completa
- **THEN** el backend escucha en ese puerto y atiende peticiones

#### Scenario: Sin herramientas de desarrollo en la imagen final
- **WHEN** se inspeccionan las dependencias instaladas en la imagen final
- **THEN** contiene solo las de producción; el compilador de TypeScript y el resto del utillaje de desarrollo no están

#### Scenario: Arranque simultáneo de varias réplicas
- **WHEN** arrancan varias réplicas del contenedor a la vez con la puesta al día del esquema activada
- **THEN** el esquema se aplica una sola vez y ninguna réplica falla por la concurrencia

### Requirement: Las migraciones se aplican al arrancar, serializadas entre réplicas
El sistema SHALL poder aplicar sus migraciones pendientes durante el arranque, desde el artefacto compilado y sin dependencias de desarrollo. Ese comportamiento SHALL estar gobernado por una variable de entorno, desactivada por defecto, para que un arranque de desarrollo no altere el esquema sin pedirlo.

La aplicación SHALL serializar esa puesta al día entre instancias mediante un cerrojo del propio PostgreSQL, de modo que varias réplicas que arranquen a la vez no compitan por aplicar las mismas migraciones. El cerrojo SHALL ser de ámbito de transacción, no de sesión, porque la conexión pasa por un pooler en modo transacción donde la sesión no es estable entre consultas.

Si la puesta al día falla, la aplicación NO SHALL aceptar tráfico: es preferible no arrancar a servir código nuevo contra un esquema que no le corresponde.

El comando de migraciones orientado a desarrollo —sobre las fuentes TypeScript— y el orientado al artefacto compilado SHALL conservarse ambos: siguen siendo la vía para aplicar un cambio de esquema a mano antes de desplegarlo.

#### Scenario: Esquema al día durante el arranque
- **WHEN** la aplicación arranca con la puesta al día activada y hay migraciones pendientes
- **THEN** las aplica antes de aceptar tráfico
- **AND** deja constancia en el registro de cuáles aplicó

#### Scenario: Arranque sin nada pendiente
- **WHEN** la aplicación arranca con la puesta al día activada y el esquema ya está al día
- **THEN** no altera el esquema y arranca con normalidad

#### Scenario: Réplicas simultáneas
- **WHEN** varias réplicas arrancan a la vez con migraciones pendientes
- **THEN** una sola las aplica y las demás esperan a que termine
- **AND** al continuar no encuentran nada pendiente y arrancan sin error

#### Scenario: Migración fallida durante el arranque
- **WHEN** una migración falla mientras se aplica
- **THEN** la transacción se deshace y la aplicación no llega a escuchar

#### Scenario: Arranque de desarrollo
- **WHEN** la aplicación arranca sin la variable activada
- **THEN** no toca el esquema, y las migraciones se siguen aplicando con los comandos existentes

### Requirement: El frontend se sirve como aplicación de página única
El despliegue del frontend SHALL declarar explícitamente el directorio de salida de la build y las reescrituras que una aplicación de página única necesita. Sin ellas, una ruta de cliente pedida directamente al servidor no corresponde a ningún archivo.

#### Scenario: Recarga sobre una ruta de cliente
- **WHEN** se abre o recarga directamente una URL profunda de la aplicación desplegada
- **THEN** el servidor devuelve el documento de la aplicación y el enrutador de cliente resuelve la vista
- **AND** no se devuelve un 404

#### Scenario: Localización del artefacto
- **WHEN** la plataforma publica la build
- **THEN** sirve el directorio que la build de Angular produce realmente, no el que la autodetección supondría

### Requirement: El despliegue está documentado y es reproducible desde cero
El repositorio SHALL documentar el despliegue completo: qué variables de entorno fija cada plataforma, en qué **orden** se hacen los pasos, y cómo se inicializa el sistema la primera vez contra la URL pública.

El orden SHALL estar escrito, no deducirse: el frontend necesita el origen del backend para compilarse y el backend necesita el origen del frontend para su lista blanca de CORS, así que las dos configuraciones no pueden fijarse a la vez.

La documentación SHALL declarar además los límites conocidos del despliegue: los *preview deployments* no quedan en la lista blanca de CORS y por tanto no autentican.

#### Scenario: Despliegue desde cero siguiendo la documentación
- **WHEN** alguien parte del repositorio sin ningún servicio creado y sigue la documentación de despliegue en orden
- **THEN** llega a un sistema público, inicializado y con sesión funcional, sin necesitar información que no esté escrita

#### Scenario: La documentación normativa no afirma atributos que ahora dependen del entorno
- **WHEN** se consulta la descripción de la cookie de sesión en el contrato de API y en las especificaciones
- **THEN** describen `SameSite` como dependiente de la topología del despliegue, con `strict` por defecto
- **AND** no lo presentan como un valor invariante

### Requirement: Las tablas quedan protegidas frente a un acceso que rodee al backend
El esquema SHALL tener Row Level Security activo en todas sus tablas, y esa activación SHALL formar parte de las migraciones, no de la configuración manual del proveedor: un entorno nuevo debe reproducirla sin pasos fuera del repositorio.

Lo exige el hecho de que el aislamiento multi-tenant vive en el backend, que filtra por `owner_id` en cada consulta. Un PostgreSQL gestionado que publique el esquema por su propia API de datos abre una vía que no pasa por el backend y por tanto **no** pasa por ese filtro.

No SHALL definirse políticas: sin ellas RLS deniega por defecto, que es el comportamiento buscado, porque ningún rol distinto de la aplicación debe leer estas tablas. Tampoco SHALL usarse `FORCE ROW LEVEL SECURITY`, del que depende que la aplicación —dueña de las tablas— siga operando sin políticas.

#### Scenario: Acceso por la API de datos del proveedor
- **WHEN** se consulta una tabla con filas a través de la API de datos del proveedor, con su clave publicable
- **THEN** no se obtiene ninguna fila

#### Scenario: La aplicación no se ve afectada
- **WHEN** la aplicación opera contra un esquema con RLS activo, conectada como dueña de las tablas
- **THEN** lee y escribe con normalidad, sin políticas definidas

#### Scenario: Reproducibilidad en un entorno nuevo
- **WHEN** se aplica el juego completo de migraciones sobre una base de datos vacía
- **THEN** todas las tablas quedan con RLS activo, sin intervención manual
