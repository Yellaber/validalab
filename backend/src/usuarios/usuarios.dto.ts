import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
