import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginacionQuerySchema } from '../../common/pagination/paginacion.dto';
import {
  estadoScoringSchema,
  respuestaEntrevistaSchema,
} from './entrevista.types';

/**
 * DTOs de entrada de las entrevistas. El `ideaId` viene del path; el bloque
 * `score` NUNCA se acepta como entrada (lo produce el agente).
 */

/** Cita de entrada (`CrearCitaRequest`): sin `id` (lo genera el servicio). */
export const crearCitaSchema = z.object({
  texto: z.string().min(1),
  contexto: z.string().optional(),
});
export type CrearCitaRequest = z.infer<typeof crearCitaSchema>;

export const crearEntrevistaSchema = z.object({
  contactoId: z.uuid(),
  guionId: z.uuid(),
  respuestas: z.array(respuestaEntrevistaSchema).min(1),
  citas: z.array(crearCitaSchema).optional(),
});
export class CrearEntrevistaDto extends createZodDto(crearEntrevistaSchema) {}

/**
 * Edición parcial. `respuestas`/`citas` opcionales; no admite `ideaId`,
 * `contactoId`, `guionId` ni `score`.
 */
export const actualizarEntrevistaSchema = z.object({
  respuestas: z.array(respuestaEntrevistaSchema).min(1).optional(),
  citas: z.array(crearCitaSchema).optional(),
});
export class ActualizarEntrevistaDto extends createZodDto(
  actualizarEntrevistaSchema,
) {}

/** Cuerpo del ajuste manual del score (`AjustarScoreRequest`). */
export const ajustarScoreSchema = z.object({
  scoreAjustado: z.number().min(0).max(10),
  nota: z.string().min(1),
});
export class AjustarScoreDto extends createZodDto(ajustarScoreSchema) {}

/** Parámetros de ruta de una entrevista concreta (idea + entrevista, uuid). */
export const idEntrevistaParamSchema = z.object({
  id: z.uuid(),
  idEntrevista: z.uuid(),
});
export class IdEntrevistaParamDto extends createZodDto(
  idEntrevistaParamSchema,
) {}

/** Query del listado: paginación + filtros opcionales `contactoId`/`estadoScoring`. */
export const listarEntrevistasQuerySchema = paginacionQuerySchema.extend({
  contactoId: z.uuid().optional(),
  estadoScoring: estadoScoringSchema.optional(),
});
export type ListarEntrevistasQuery = z.infer<
  typeof listarEntrevistasQuerySchema
>;
export class ListarEntrevistasQueryDto extends createZodDto(
  listarEntrevistasQuerySchema,
) {}
