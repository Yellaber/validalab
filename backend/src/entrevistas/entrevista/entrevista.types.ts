import { z } from 'zod';

/** Respuesta capturada a una pregunta del guión (`RespuestaEntrevista`). */
export const respuestaEntrevistaSchema = z.object({
  preguntaId: z.uuid(),
  texto: z.string(),
});
export type RespuestaEntrevista = z.infer<typeof respuestaEntrevistaSchema>;

/** Cita textual del entrevistado (`Cita`); su `id` lo genera la aplicación. */
export const citaSchema = z.object({
  id: z.uuid(),
  texto: z.string(),
  contexto: z.string().optional(),
});
export type Cita = z.infer<typeof citaSchema>;

/** Estado del scoring del agente sobre la entrevista (`EstadoScoring`). */
export const estadoScoringSchema = z.enum(['pendiente', 'puntuada', 'fallida']);
export type EstadoScoring = z.infer<typeof estadoScoringSchema>;

/**
 * Resultado del scoring del agente (`ScoreEntrevista`), de solo lectura. Lo
 * produce el Validador Inteligente (chunk C); en este chunk el bloque es `null`.
 */
export const scoreEntrevistaSchema = z.object({
  score: z.number().min(0).max(10),
  justificacion: z.string(),
  senales: z.array(z.string()),
  confianza: z.number().min(0).max(100),
  proveedor: z.string().optional(),
  modelo: z.string().optional(),
  rubricaVersion: z.string().optional(),
  hashEntrada: z.string().optional(),
  tokensEntrada: z.number().int().min(0).optional(),
  tokensSalida: z.number().int().min(0).optional(),
  costoEstimado: z.number().min(0).optional(),
  moneda: z.string().optional(),
  fechaScoring: z.iso.datetime().optional(),
});
export type ScoreEntrevista = z.infer<typeof scoreEntrevistaSchema>;

/** Ajuste humano del score (`AjusteScore`), conservado junto al del agente. */
export const ajusteScoreSchema = z.object({
  scoreAjustado: z.number().min(0).max(10),
  nota: z.string(),
  fechaAjuste: z.iso.datetime(),
});
export type AjusteScore = z.infer<typeof ajusteScoreSchema>;
