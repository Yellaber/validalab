import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { estadoHipotesisSchema, tipoHipotesisSchema } from './hipotesis.types';

/**
 * DTOs de entrada de las hipótesis. Validados por el `ZodValidationPipe` global.
 * El `ideaId` NUNCA se acepta como entrada: se deriva del path. El `estado` no
 * se admite al crear (nace `pendiente`).
 */

export const crearHipotesisSchema = z.object({
  tipo: tipoHipotesisSchema,
  enunciado: z.string().min(1),
});
export class CrearHipotesisDto extends createZodDto(crearHipotesisSchema) {}

/**
 * Edición parcial (PATCH): `tipo`, `enunciado` y/o `estado`, todos opcionales.
 * NO admite `ideaId`: una hipótesis nunca cambia de idea.
 */
export const actualizarHipotesisSchema = z.object({
  tipo: tipoHipotesisSchema.optional(),
  enunciado: z.string().min(1).optional(),
  estado: estadoHipotesisSchema.optional(),
});
export class ActualizarHipotesisDto extends createZodDto(
  actualizarHipotesisSchema,
) {}

/**
 * Parámetros de ruta de las operaciones sobre una hipótesis concreta: la idea
 * (`id`) y la hipótesis (`idHipotesis`), ambos uuid; un formato inválido →
 * VALIDACION_FALLIDA.
 */
export const idHipotesisParamSchema = z.object({
  id: z.uuid(),
  idHipotesis: z.uuid(),
});
export class IdHipotesisParamDto extends createZodDto(idHipotesisParamSchema) {}
