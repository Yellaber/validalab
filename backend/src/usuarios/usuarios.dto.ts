import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { estadoUsuarioSchema, rolSchema } from './usuario.types';

/**
 * DTOs de entrada del módulo usuarios. Validados por el `ZodValidationPipe`
 * global de la fundación. Los límites reflejan el contrato (password ≥ 8,
 * nombre ≥ 1, email). El email se normaliza a minúsculas en el servicio.
 */

export const registroUsuarioSchema = z.object({
  email: z.email(),
  nombre: z.string().min(1),
  password: z.string().min(8),
});
export class RegistroUsuarioDto extends createZodDto(registroUsuarioSchema) {}

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export class LoginDto extends createZodDto(loginSchema) {}

export const refrescarTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export class RefrescarTokenDto extends createZodDto(refrescarTokenSchema) {}

export const actualizarPerfilSchema = z.object({
  nombre: z.string().min(1),
});
export class ActualizarPerfilDto extends createZodDto(actualizarPerfilSchema) {}

/**
 * DTOs de administración (rol `administrador`). El `id` de la cuenta objetivo
 * llega por la ruta y se valida como uuid; un formato inválido → VALIDACION_FALLIDA.
 */
export const idUsuarioParamSchema = z.object({
  id: z.uuid(),
});
export class IdUsuarioParamDto extends createZodDto(idUsuarioParamSchema) {}

export const cambiarRolSchema = z.object({
  rol: rolSchema,
});
export class CambiarRolDto extends createZodDto(cambiarRolSchema) {}

export const cambiarEstadoSchema = z.object({
  estado: estadoUsuarioSchema,
});
export class CambiarEstadoDto extends createZodDto(cambiarEstadoSchema) {}
