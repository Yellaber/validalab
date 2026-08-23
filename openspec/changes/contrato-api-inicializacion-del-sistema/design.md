## Context

El contrato tiene un agujero de origen: describe qué puede hacer un `administrador`, pero no de dónde sale el primero. `POST /usuarios/registro` asigna `validador` sin excepción y `PATCH /usuarios/{id}/rol` exige ya ser administrador, así que sobre una base de datos vacía el rol es inalcanzable por API.

Tres hechos ya escritos delimitan el espacio de soluciones:

1. **El registro es público** (`security: []`, previo a la autenticación) y su rol por defecto está fijado en el requisito «Registro de usuario» del contrato.
2. **`administrador` no es un rol de tenant**: según el `CLAUDE.md` raíz, las operaciones de administración de cuentas son la **única** excepción al filtro por `owner_id`. Quien lo obtiene ve todas las cuentas del sistema.
3. **El estado «inicializado» no existe hoy** en el contrato. Es una noción nueva que este change introduce y que solo esta operación consulta.

De (2) se sigue lo que hace delicado el diseño: el primer administrador no es «un usuario más», es el operador del sistema. Cualquier camino que lo produzca es, por definición, un camino de escalada de privilegios, y su seguridad no puede depender de que nadie se dé cuenta de que existe.

## Goals / Non-Goals

**Goals:**
- Definir en el contrato el origen —único y explícito— del rol `administrador`.
- Que ese origen sea irrepetible: usado una vez, deja de estar disponible para siempre.
- Que no exista una ventana en la que un tercero pueda reclamar el administrador de un sistema recién desplegado.
- Eliminar el `UPDATE` manual sobre Postgres de la puesta en marcha.

**Non-Goals:**
- Cambiar el registro público, que sigue asignando `validador` antes y después de la inicialización.
- Recuperar el acceso si se pierde la cuenta administradora.
- Sembrar datos iniciales distintos de esa cuenta (el catálogo de modelos y los precios ya se siembran en migraciones).
- Definir cómo se persiste el marcador de inicialización: es una decisión del backend, no del contrato.

## Decisions

### D1 — Un endpoint dedicado, no un rol especial en el registro
La alternativa evaluada y descartada era no añadir ruta: que `POST /usuarios/registro` asignara `administrador` cuando el sistema estuviera virgen y `validador` después.

Es más barata en superficie de API —cero endpoints nuevos— y tiene precedente en muchos productos autoalojados. Se descarta por dos razones. La primera es que **acopla dos operaciones con públicos distintos**: el registro es la puerta por la que entran los usuarios del SaaS, y la puesta en marcha es una tarea del operador que ocurre una sola vez; fundirlas obliga a que la ruta más expuesta del sistema cargue con la lógica más sensible. La segunda es que **hace el rol dependiente del momento**: la misma petición, con el mismo cuerpo y las mismas credenciales, produce un resultado distinto según el estado global del sistema. Es exactamente el tipo de regla que se olvida al leer el endpoint y sorprende en producción.

Separarlas mantiene `usuarios` intacto: este change no modifica ningún requisito existente.

### D2 — Protegido por un secreto de despliegue, no abierto
Es la decisión de fondo del change. Un `POST /sistema/inicializar` sin protección sería funcional y simple: el operador despliega, llama, y el sistema queda cerrado para siempre. Pero entre esos dos instantes existe una **ventana de reclamación**: cualquiera que alcance la API antes que el operador se queda con el administrador del sistema, y el candado de un solo uso convierte esa pérdida en irreversible —el operador legítimo ya no puede inicializar nada, solo registrarse como `validador`. No es una amenaza hipotética: los escáneres automáticos buscan asistentes de instalación sin cerrar, y es una familia de vulnerabilidad con historial en productos reales.

La protección elegida es un secreto que el operador fija en el entorno del despliegue y presenta en la cabecera `X-Bootstrap-Token`. Se modela como `securityScheme` de tipo `apiKey` (`bootstrapToken`) y no como un campo del cuerpo, por tres motivos: es lo que OpenAPI ya sabe expresar, hace que la operación declare `security: [bootstrapToken]` en vez de `security: []` —el documento dice la verdad sobre sí mismo—, y mantiene el secreto fuera del payload que se registra en los logs de aplicación.

Alternativa descartada: una **ventana temporal** (el endpoint solo responde durante los primeros N minutos de vida del proceso). Reduce la exposición pero no la elimina —quien observe el despliegue sigue ganando la carrera— y añade un modo de fallo desagradable: si el operador tarda, hay que reiniciar el backend para reabrir la ventana. Un secreto no caduca ni obliga a correr.

### D3 — De un solo uso y sin marcha atrás
Inicializado el sistema, toda llamada posterior responde `409 CONFLICTO`, **incluso presentando el secreto correcto**. El secreto autoriza la operación; no la vuelve repetible.

No se define ninguna ruta para des-inicializar. Un endpoint capaz de devolver el sistema a estado virgen sería una puerta trasera permanente hacia un segundo administrador, y anularía toda la protección anterior. El estado es terminal por diseño.

Se elige `409 CONFLICTO` —«conflicto de estado»— y no `403` ni `404`. La operación existe y el llamante puede estar perfectamente autorizado; lo que falla es el estado del sistema. Es la misma semántica con la que el contrato ya trata un `email` duplicado en el registro.

### D4 — El endpoint crea su cuenta, no promueve una existente
La variante «promover» —el endpoint recibe un email ya registrado y le cambia el rol— obligaría al operador a registrarse antes por la vía pública y convertiría la puesta en marcha en dos pasos con un rodeo por la UI. Crear la cuenta en la misma operación deja el arranque en una sola llamada.

El cuerpo es por tanto el mismo que el del registro (`email`, `nombre`, `password`) y aplica las mismas reglas de validación; un payload inválido responde `422 VALIDACION_FALLIDA`, igual que en `POST /usuarios/registro`. La consecuencia para el backend es que ambas rutas deben compartir el mismo camino de alta de cuentas —con su hashing y sus invariantes— y diferenciarse solo en el rol resultante.

### D5 — La respuesta no incluye sesión
Devuelve el recurso `Usuario` creado (`rol: administrador`, `estado: activo`), sin `accessToken` ni cookie de refresh. El administrador inicia sesión después por `POST /usuarios/login` como cualquier otra cuenta.

Emitir sesión aquí ahorraría un paso, pero mezclaría dos responsabilidades y obligaría a esta ruta a cargar con el mecanismo de cookies `HttpOnly` del login. Además, quien inicializa el sistema —posiblemente un script de despliegue— no es necesariamente quien va a usar la cuenta.

### D6 — Un `tag` nuevo, `sistema`
Los siete `tags` actuales son módulos de dominio. La inicialización no es dominio: es ciclo de vida de la instalación. Colgarla de `usuarios` porque «crea un usuario» describiría el efecto secundario en vez del propósito, y dejaría la operación más sensible del contrato escondida entre las rutas de cuentas.

El `tag` nace con una sola operación, y es probable que se le sumen otras (estado de la instalación, verificación de salud administrativa). Su descripción debe dejar claro que agrupa operaciones de instalación, no de negocio.

## Risks / Trade-offs

- **Se pierde el acceso a la cuenta administradora** (contraseña olvidada, cuenta suspendida por error) → no hay recuperación por API: la inicialización ya se consumió. La mitigación dentro del contrato es que un administrador puede promover a otro con `PATCH /usuarios/{id}/rol`, de modo que tener **dos** administradores desde el principio es la práctica recomendable. Fuera del contrato, queda la intervención directa en base de datos, que es exactamente lo que este change viene a eliminar del camino normal —pero sigue existiendo como último recurso para quien controla la infraestructura.
- **El secreto se filtra antes de inicializar** → equivale a perder el sistema, porque quien lo tenga puede reclamar el administrador. Se mitiga con la práctica habitual de cualquier secreto de despliegue (generarlo aleatorio, no versionarlo, no pasarlo por argumentos de línea de comandos) y, sobre todo, porque **la ventana se cierra en cuanto el operador inicializa**: filtrarlo después es inocuo.
- **El secreto queda configurado para siempre aunque ya no sirva** → tras la inicialización, la variable sigue en el entorno sin ninguna función. No es un riesgo real, dado que presentarlo ya no permite nada, pero conviene que la documentación de despliegue diga que puede retirarse.
- **Dos llamadas simultáneas sobre un sistema virgen** → el contrato exige que solo una produzca un administrador, y deja al backend la responsabilidad de resolverlo de forma atómica. Una comprobación de tipo «¿está vacío?» seguida de una escritura no basta: ambas llamadas pueden leer «vacío» a la vez. El marcador debe decidirlo en la base de datos, no en memoria.
- **`sistema` abre la puerta a un cajón de sastre** → un `tag` que no es dominio puede acabar recogiendo cualquier operación que no encaje en otro sitio. Se acota en su descripción a operaciones de ciclo de vida de la instalación.

## Migration Plan

No aplica al contrato: es una ruta nueva y no modifica ninguna existente, así que ningún cliente actual se rompe.

Para el despliegue que venga después de implementarlo: los sistemas que **ya** estén operando con un administrador creado a mano deben quedar marcados como inicializados, o el endpoint quedaría disponible en un sistema que ya tiene administrador. Es una consideración del change de backend —y el motivo por el que el marcador conviene que sea un dato explícito y no una inferencia sobre la tabla de usuarios—, pero se anota aquí porque nace de esta decisión de contrato.

## Open Questions

Ninguna. El mecanismo (endpoint dedicado), la protección (secreto de despliegue en cabecera), el candado (un solo uso, sin reversa) y el contenido de la respuesta (usuario sin sesión) quedan decididos.
