import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
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

/** Tokens de sesión emitidos en login y refresh (esquema `TokenRespuesta`). */
export const tokenRespuestaSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenTipo: z.literal('Bearer'),
  expiraEn: z.number().int(),
  usuario: usuarioRespuestaSchema,
});
export type TokenRespuesta = z.infer<typeof tokenRespuestaSchema>;
export class TokenRespuestaDto extends createZodDto(tokenRespuestaSchema) {}

/** Página de cuentas (esquema `UsuariosPaginados`), para el listado de admin. */
export const usuariosPaginadosSchema = z.object({
  datos: z.array(usuarioRespuestaSchema),
  paginacion: z.object({
    pagina: z.number().int(),
    porPagina: z.number().int(),
    total: z.number().int(),
    totalPaginas: z.number().int(),
  }),
});
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
