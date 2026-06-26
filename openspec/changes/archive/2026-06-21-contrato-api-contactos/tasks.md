## 1. Schemas de dominio de contactos

- [x] 1.1 Añadir los enums `EstadoOutreach` (`por_contactar`|`contactado`|`respondio`|`agendado`|`entrevistado`|`descartado`), `CanalContacto` (`linkedin`|`correo`|`mensajeria`|`otro`) y `OrigenContacto` (`busqueda_directa`|`referido`|`comunidad`|`evento`|`otro`)
- [x] 1.2 Añadir el schema `Contacto` (`id`, `ideaId` solo lectura, `nombre`, `perfil`, `enlace`, `canal`, `origen`, `referidoPorId` nullable, `estado` solo lectura, `primerToqueEn`/`segundoToqueEn` nullable solo lectura, `notas`, `fechaCreacion`, `fechaActualizacion`)
- [x] 1.3 Añadir los requests `CrearContactoRequest` (`nombre` requerido; `perfil`, `enlace`, `canal`, `origen`, `referidoPorId`; sin `estado`/`ideaId`/toques) y `ActualizarContactoRequest` (todos opcionales; sin `ideaId`/`estado`/toques)
- [x] 1.4 Añadir los requests de acción `TransicionEstadoRequest` (`estado` requerido) y `RegistrarToqueRequest` (`fecha` opcional)
- [x] 1.5 Añadir el sobre `ContactosPaginados` (sobre `RespuestaPaginada` con `datos` de `Contacto`)
- [x] 1.6 Añadir el parámetro de path `idContacto` y el parámetro de query de filtro por estado de outreach

## 2. Endpoints CRUD de contactos (tag `contactos`, anidados en la idea)

- [x] 2.1 Definir `POST /ideas/{id}/contactos` con `CrearContactoRequest` → `201` `Contacto` en `por_contactar`, errores `401`/`403`/`404`/`422`
- [x] 2.2 Definir `GET /ideas/{id}/contactos` (paginado + filtro por `estado`) → `200` `ContactosPaginados`, errores `401`/`403`/`404`
- [x] 2.3 Definir `GET /ideas/{id}/contactos/{idContacto}` → `200` `Contacto`, errores `401`/`403`/`404`
- [x] 2.4 Definir `PATCH /ideas/{id}/contactos/{idContacto}` con `ActualizarContactoRequest` → `200` `Contacto`, errores `401`/`403`/`404`/`422`
- [x] 2.5 Definir `DELETE /ideas/{id}/contactos/{idContacto}` → `204` sin contenido, errores `401`/`403`/`404`

## 3. Endpoints de acción del embudo y toques

- [x] 3.1 Definir `POST /ideas/{id}/contactos/{idContacto}/estado` con `TransicionEstadoRequest` → `200` `Contacto`, errores `401`/`403`/`404`/`409` (transición inválida o `entrevistado` manual)/`422` (estado fuera de enum)
- [x] 3.2 Definir `POST /ideas/{id}/contactos/{idContacto}/toques` con `RegistrarToqueRequest` → `200` `Contacto`, errores `401`/`403`/`404`/`409` (tercer toque)

## 4. Verificación

- [x] 4.1 Validar que el OpenAPI sigue siendo válido y parseable tras los cambios
- [x] 4.2 Confirmar el aislamiento: rutas `/ideas/{id}/...` sobre idea ajena → `403`, idea/contacto inexistente → `404`
- [x] 4.3 Confirmar que `CrearContactoRequest` no acepta `ideaId`, `estado` ni fechas de toque, y que el contacto nace `por_contactar`
- [x] 4.4 Confirmar que la transición a `entrevistado` por la acción de estado responde `409`, y que `descartado` es alcanzable desde estados no terminales
- [x] 4.5 Confirmar que el tercer toque responde `409` y que `referidoPorId` permite trazar la cadena de referidos
- [x] 4.6 Confirmar que sigue siendo un único documento (solo se tocó `paths` y `components`) y que no se añadieron códigos de error nuevos
