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

/**
 * Estado del scoring del agente sobre la entrevista (`EstadoScoring`). Nace
 * `pendiente`; al dispararse el agente pasa a `procesando` y termina en
 * `puntuada` (con `score`) o `fallida`.
 */
export const estadoScoringSchema = z.enum([
  'pendiente',
  'procesando',
  'puntuada',
  'fallida',
]);
export type EstadoScoring = z.infer<typeof estadoScoringSchema>;

/**
 * Señales estructuradas por entrevista que el agente clasifica al puntuar. Son el
 * insumo de los KPIs de señal de problema/pago (E5). Se validan siempre con Zod y
 * viajan dentro del bloque `score`. Opcionales en el score persistido: los scores
 * de la rúbrica anterior no las tienen (cuentan como `false` en los KPIs).
 */
export const senalesEstructuradasSchema = z.object({
  /** La entrevista confirma que el dolor/problema existe. */
  dolorConfirmado: z.boolean(),
  /** El entrevistado lo califica como urgente/prioritario. */
  dolorUrgente: z.boolean(),
  /** No usa hoy una solución que le sirva (dolor sin resolver). */
  sinSolucionActual: z.boolean(),
  /** Muestra interés explícito en pagar por una solución. */
  disposicionPago: z.boolean(),
});
export type SenalesEstructuradas = z.infer<typeof senalesEstructuradasSchema>;

/**
 * Resultado del scoring del agente (`ScoreEntrevista`), de solo lectura. Lo
 * produce el Validador Inteligente (E4). `senalesEstructuradas` es opcional por
 * compatibilidad con scores de la rúbrica anterior.
 */
export const scoreEntrevistaSchema = z.object({
  score: z.number().min(0).max(10),
  justificacion: z.string(),
  senales: z.array(z.string()),
  confianza: z.number().min(0).max(100),
  senalesEstructuradas: senalesEstructuradasSchema.optional(),
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
