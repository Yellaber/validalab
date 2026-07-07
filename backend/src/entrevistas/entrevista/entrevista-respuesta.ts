import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Entrevista } from './entrevista.entity';
import {
  ajusteScoreSchema,
  citaSchema,
  estadoScoringSchema,
  respuestaEntrevistaSchema,
  scoreEntrevistaSchema,
} from './entrevista.types';

/**
 * Esquemas de respuesta de la entrevista. Reproducen el recurso `Entrevista`.
 * `score` y `ajuste` son `nullable` (el `score` lo produce el agente, chunk C;
 * el `ajuste`, el usuario).
 */
export const entrevistaRespuestaSchema = z.object({
  id: z.uuid(),
  ideaId: z.uuid(),
  contactoId: z.uuid(),
  guionId: z.uuid(),
  respuestas: z.array(respuestaEntrevistaSchema),
  citas: z.array(citaSchema),
  estadoScoring: estadoScoringSchema,
  score: scoreEntrevistaSchema.nullable(),
  ajuste: ajusteScoreSchema.nullable(),
  fechaCreacion: z.iso.datetime(),
  fechaActualizacion: z.iso.datetime(),
});
export type EntrevistaRespuesta = z.infer<typeof entrevistaRespuestaSchema>;
export class EntrevistaRespuestaDto extends createZodDto(
  entrevistaRespuestaSchema,
) {}

/** Página de entrevistas (esquema `EntrevistasPaginadas`). */
export const entrevistasPaginadasSchema = z.object({
  datos: z.array(entrevistaRespuestaSchema),
  paginacion: z.object({
    pagina: z.number().int(),
    porPagina: z.number().int(),
    total: z.number().int(),
    totalPaginas: z.number().int(),
  }),
});
export class EntrevistasPaginadasDto extends createZodDto(
  entrevistasPaginadasSchema,
) {}

/** Mapea la entidad `Entrevista` al recurso del contrato. */
export function aEntrevistaDto(entrevista: Entrevista): EntrevistaRespuesta {
  return {
    id: entrevista.id,
    ideaId: entrevista.ideaId,
    contactoId: entrevista.contactoId,
    guionId: entrevista.guionId,
    respuestas: entrevista.respuestas,
    citas: entrevista.citas,
    estadoScoring: entrevista.estadoScoring,
    score: entrevista.score,
    ajuste: entrevista.ajuste,
    fechaCreacion: entrevista.fechaCreacion.toISOString(),
    fechaActualizacion: entrevista.fechaActualizacion.toISOString(),
  };
}
