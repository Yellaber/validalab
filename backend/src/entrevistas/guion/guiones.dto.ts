import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * DTOs de entrada del guión. Validados por el `ZodValidationPipe` global. El
 * `ownerId` NUNCA se acepta como entrada (se deriva del token) y las preguntas
 * de entrada NO llevan `id` (lo genera el servicio).
 */

/** Pregunta de entrada (`PreguntaRequest`): sin `id`. */
export const preguntaRequestSchema = z.object({
  orden: z.number().int().min(1),
  texto: z.string().min(1),
});
export type PreguntaRequest = z.infer<typeof preguntaRequestSchema>;

export const crearGuionSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  preguntas: z.array(preguntaRequestSchema).min(1),
});
export class CrearGuionDto extends createZodDto(crearGuionSchema) {}

/**
 * Edición parcial (PATCH). Todos opcionales; `preguntas`, si viene, reemplaza el
 * conjunto ordenado completo.
 */
export const actualizarGuionSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  preguntas: z.array(preguntaRequestSchema).min(1).optional(),
});
export class ActualizarGuionDto extends createZodDto(actualizarGuionSchema) {}

/** `idGuion` de la ruta, uuid; formato inválido → VALIDACION_FALLIDA. */
export const idGuionParamSchema = z.object({
  idGuion: z.uuid(),
});
export class IdGuionParamDto extends createZodDto(idGuionParamSchema) {}
