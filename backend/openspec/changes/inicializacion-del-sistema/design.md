## Context

El contrato ya está escrito y archivado (capacidad `sistema` en la raíz): tres requisitos, nueve escenarios. Este change solo decide **cómo** cumplirlos sobre la fundación existente.

Cuatro hechos del código acotan el espacio de soluciones:

1. **El `JwtAuthGuard` es global** y exige token salvo en las rutas `@Publico()`. La inicialización tiene que ser pública para el guard de JWT, pero no puede quedar desprotegida.
2. **Nadie lee `process.env`**: el requisito de `arranque-plataforma` obliga a pasar por `AppConfigService`, alimentado por un esquema Zod validado al arranque.
3. **El alta de cuentas vive en `UsuariosService.registrar`**, con la normalización de email (`trim().toLowerCase()`), el hashing y el control de duplicados —incluida la carrera, vía la restricción única de `email`.
4. **Las migraciones son la fuente de verdad del esquema** (`migrationsRun: false`, `synchronize: false`), así que la tabla del marcador llega por migración y se aplica explícitamente.

El punto delicado no es el camino feliz, sino los dos bordes que la spec exige de forma explícita: que el `409` aplique **aunque el secreto sea correcto**, y que dos peticiones simultáneas produzcan **como mucho** un administrador.

## Goals / Non-Goals

**Goals:**
- Implementar los nueve escenarios de la capacidad `sistema` sin desviarse del contrato.
- Que la concurrencia la resuelva la base de datos, no una comprobación en memoria.
- Reutilizar el alta de cuentas existente en vez de duplicar hashing e invariantes.
- No romper los despliegues que ya operan con un administrador creado a mano.

**Non-Goals:**
- Cambiar `POST /usuarios/registro` en ningún aspecto.
- Recuperar el acceso a una cuenta administradora perdida.
- Un panel de administración por API.
- Retirar automáticamente el secreto del entorno tras la inicialización.

## Decisions

### D1 — El marcador es una tabla de fila única, y es el árbitro de la carrera
`inicializacion_sistema` con `id integer PRIMARY KEY` y `CHECK (id = 1)`: como mucho una fila puede existir, y el segundo `INSERT` viola la clave primaria. Guarda además `ejecutado_en`, `version` y `admin_email` para dejar traza auditable de la puesta en marcha.

La alternativa evaluada era **inferir el estado** de la tabla de usuarios: «hay administrador → ya inicializado». No añade esquema, pero se descarta por dos razones. La primera es la carrera que la spec prohíbe explícitamente: dos peticiones simultáneas leerían «no hay administrador» a la vez y ambas crearían uno; un `SELECT` seguido de un `INSERT` no es atómico salvo que se serialice a mano. La segunda es que el estado sería reversible sin querer — borrar o degradar al último administrador devolvería el sistema a «virgen» y reabriría el endpoint, que es exactamente lo que el requisito de irreversibilidad prohíbe.

Con la tabla, el flujo es al revés de lo intuitivo: **primero se inserta el marcador, después se crea la cuenta**, todo en una transacción. Insertar primero convierte la comprobación y la reserva en un solo acto atómico; si el `INSERT` falla por violación de clave, el sistema ya estaba inicializado y se responde `409` sin haber tocado nada más. Comprobar antes e insertar después reintroduciría la ventana que la tabla existe para cerrar.

### D2 — El `409` se decide por el marcador, nunca por el secreto
La spec es explícita: ya inicializado responde `409` **aunque se presente el secreto correcto**. De ahí el orden de las comprobaciones: el guard valida el secreto (`401` si falla) y solo después el service intenta reservar el marcador (`409` si ya existe).

Invertirlo —responder `409` antes de validar el secreto— convertiría el endpoint en un oráculo: cualquiera podría preguntar sin credenciales si un sistema está inicializado. Con este orden, quien no tiene el secreto recibe siempre `401` y no aprende nada sobre el estado de la instalación, que es lo que pide el escenario «Secreto incorrecto».

### D3 — `BOOTSTRAP_TOKEN` opcional en el esquema, con longitud mínima si está presente
Hacerlo obligatorio encaja con la filosofía fail-fast del resto de la configuración, pero **rompería todo despliegue ya operando**: un sistema que hoy funciona con su administrador creado a mano dejaría de arrancar tras actualizar, por una variable que ya no necesita. Es un precio inaceptable para una operación que solo ocurre una vez.

Se declara entonces opcional, con un mínimo de 32 caracteres cuando está presente para que un secreto trivial no pase inadvertido. Si no está configurado, el guard rechaza **todas** las peticiones a la inicialización con `401`: sin secreto no hay forma de autorizar, y un sistema virgen simplemente no se puede inicializar hasta que el operador lo configure. Esa es la postura segura — el fallo por defecto es «denegar», no «permitir».

### D4 — Comparación del secreto en tiempo constante
`crypto.timingSafeEqual` sobre los buffers, con una comparación previa de longitud que no cortocircuite el resto. Una comparación con `===` filtra por temporización cuántos caracteres iniciales coinciden, y aquí el secreto es la única barrera entre un atacante y el control del sistema. El coste de hacerlo bien es una función de cinco líneas.

`timingSafeEqual` lanza si los buffers difieren en longitud, así que la longitud se compara aparte y se devuelve el mismo `401` en ambos casos.

### D5 — El alta se reutiliza mediante un método explícito, no parametrizando el registro
Tres caminos posibles: (a) duplicar la creación en `SistemaService`, (b) añadir un parámetro `rol` a `UsuariosService.registrar`, (c) extraer el alta a un método interno compartido y exponer una operación distinta para el administrador.

Se descarta (a) porque duplicaría el hashing, la normalización y el manejo de la violación única — exactamente lo que el requisito de reutilización quiere evitar. Se descarta (b) porque convierte el rol en un parámetro del camino que sirve al **endpoint público**: bastaría un error de cableado para que el registro público aceptara crear administradores. El riesgo no compensa el ahorro de un método.

Se elige (c): `UsuariosService` gana `crearAdministradorInicial(datos)`, que delega en el mismo helper privado de alta que usa `registrar` y difiere solo en el rol. La firma dice lo que hace, no admite otro rol, y el camino público queda literalmente incapaz de producir un `administrador`.

### D6 — Un guard propio, no una extensión del `JwtAuthGuard`
`BootstrapTokenGuard` se aplica solo a este controller. Mezclar la lógica del secreto en el guard global de JWT contaminaría la ruta que atraviesa **todas** las peticiones del sistema con una comprobación que solo importa una vez en la vida de la instalación.

El endpoint lleva `@Publico()` para que el guard global lo deje pasar, y el guard propio lo protege después. La combinación es deliberada y merece un comentario en el código: `@Publico()` aquí no significa «abierto», significa «no autenticado por JWT».

El escenario «Un token de sesión no sustituye al secreto» se cumple solo: el guard propio no mira `Authorization` en absoluto.

### D7 — La migración siembra el marcador en sistemas ya operando
Si la base de datos ya tiene alguna cuenta con rol `administrador`, la migración inserta la fila del marcador con `admin_email` del administrador más antiguo. Sin esto, un sistema en producción quedaría marcado como «no inicializado» tras el despliegue y su endpoint de inicialización estaría **disponible** — precisamente el escenario que todo el diseño intenta evitar.

El `down` de la migración elimina la tabla completa; es coherente, porque revertir la migración devuelve el esquema al estado en que la noción de «inicializado» no existía.

## Risks / Trade-offs

- **El operador despliega sin `BOOTSTRAP_TOKEN` y no entiende el `401`** → el mensaje del guard debe distinguir «no hay secreto configurado en el servidor» de «el secreto presentado no coincide» en los **logs**, devolviendo el mismo `401` genérico al cliente. El operador mira los logs; el atacante solo ve el `401`.
- **La transacción crea el marcador y falla el alta** → al ir ambas operaciones en la misma transacción, el rollback deshace también el marcador y el sistema sigue inicializable. Es el comportamiento correcto: un email duplicado o una contraseña inválida no deben consumir el único intento de inicialización.
- **Email ya registrado como `validador`** → responde `409 CONFLICTO` por el conflicto de email, dentro de la transacción, y el marcador se revierte. El operador puede reintentar con otro email. El contrato no distingue ambos `409`, lo cual es aceptable: los dos significan «conflicto de estado» y el mensaje los diferencia.
- **La spec exige «como mucho una» cuenta, no «exactamente una»** → si dos peticiones concurren y la ganadora falla por validación, ninguna crea cuenta. Es conforme y deseable.
- **El secreto queda en el entorno tras la inicialización** → inocuo, porque presentarlo ya no permite nada (`409` con secreto válido o sin él). Se documenta en `.env.example` que puede retirarse.
- **Fila única impuesta con `CHECK (id = 1)`** → es una restricción poco habitual y puede sorprender a quien lea el esquema. Se comenta en la migración y en la entidad para que su intención quede clara.

## Migration Plan

1. Aplicar la migración (`npm run migration:run`): crea `inicializacion_sistema` y siembra el marcador si ya existe algún administrador.
2. Desplegar el backend con `BOOTSTRAP_TOKEN` configurado si el sistema aún no está inicializado; los que ya lo están pueden desplegar sin la variable.
3. Verificar `run` / `revert` / `run` contra PostgreSQL en Docker, como el resto de las migraciones del repo.

Rollback: revertir la migración elimina la tabla y la noción de «inicializado» con ella. Seguro mientras se revierta también el código, porque el módulo `sistema` consulta esa tabla en cada llamada al endpoint.

## Open Questions

Ninguna. El contrato fija el comportamiento observable y las cinco decisiones de implementación (marcador, orden de comprobaciones, opcionalidad del secreto, reutilización del alta y aislamiento del guard) quedan resueltas arriba.
