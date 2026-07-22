import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { esquemaPaginado } from '../../common/pagination/paginado.schema';
import { Usuario } from './usuario.entity';
import { estadoUsuarioSchema, rolSchema } from './usuario.types';

/**
 * Esquemas de respuesta del módulo usuarios. Se derivan con Zod (única gramática
 * de esquemas del proyecto) para servir a dos consumidores desde una sola fuente:
 * el tipo TypeScript (`z.infer`) que usan servicio y controlador, y el DTO
 * (`createZodDto`) que `@nestjs/swagger` publica como esquema OpenAPI vía
 * `patchNestJsSwagger`. La forma reproduce el contrato `contrato-api/openapi.yaml`.
 */

/** Recurso `Usuario` del contrato. NUNCA incluye contraseña ni hash. */
export const usuarioRespuestaSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  nombre: z.string(),
  rol: rolSchema,
  estado: estadoUsuarioSchema,
  fechaCreacion: z.iso.datetime(),
});
export type UsuarioRespuesta = z.infer<typeof usuarioRespuestaSchema>;
export class UsuarioRespuestaDto extends createZodDto(usuarioRespuestaSchema) {}

/**
 * Cuerpo de sesión emitido en login y refresh (esquema `TokenRespuesta`). NO
 * incluye el `refreshToken`: ese viaja en la cookie `HttpOnly`. El cliente usa el
 * `accessToken` en `Authorization: Bearer` y lo mantiene en memoria.
 */
export const tokenRespuestaSchema = z.object({
  accessToken: z.string(),
  tokenTipo: z.literal('Bearer'),
  expiraEn: z.number().int(),
  usuario: usuarioRespuestaSchema,
});
export type TokenRespuesta = z.infer<typeof tokenRespuestaSchema>;
export class TokenRespuestaDto extends createZodDto(tokenRespuestaSchema) {}

/**
 * Sesión emitida por el servicio: separa el `cuerpo` (JSON de respuesta, sin
 * refresh) del `refreshToken` opaco, que el controlador coloca en la cookie
 * `HttpOnly`. Así el servicio no depende del transporte HTTP y queda testeable.
 */
export interface SesionEmitida {
  cuerpo: TokenRespuesta;
  refreshToken: string;
}

/** Página de cuentas (esquema `UsuariosPaginados`), para el listado de admin. */
export const usuariosPaginadosSchema = esquemaPaginado(usuarioRespuestaSchema);
export class UsuariosPaginadosDto extends createZodDto(
  usuariosPaginadosSchema,
) {}

/**
 * Mapea la entidad `Usuario` al recurso del contrato, excluyendo
 * explícitamente `passwordHash` (no se copia ningún campo de credencial).
 */
export function aUsuarioDto(usuario: Usuario): UsuarioRespuesta {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    estado: usuario.estado,
    fechaCreacion: usuario.fechaCreacion.toISOString(),
  };
}
