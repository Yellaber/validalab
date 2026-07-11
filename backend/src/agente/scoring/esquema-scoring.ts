import { z } from 'zod';
import { senalesEstructuradasSchema } from '../../entrevistas/entrevista/entrevista.types';

/**
 * Esquema de la salida CRUDA del agente al puntuar una entrevista (RF-AG-02,
 * RNF-20). Es el contrato mínimo que el modelo DEBE cumplir; se revalida con
 * este esquema antes de tocar el `score`, y una salida que no lo cumple se
 * reintenta (RF-AG-03). Los metadatos (proveedor, modelo, hash, tokens…) los
 * añade el servicio; el modelo produce estos campos, incluidas las señales
 * estructuradas que alimentan los KPIs de señal (E5).
 */
export const salidaScoringSchema = z.object({
  /** Puntuación de la entrevista, entero de 0 a 10. */
  score: z.number().int().min(0).max(10),
  /** Justificación breve del score, en prosa. */
  justificacion: z.string().min(1),
  /** Señales concretas detectadas en las respuestas (dolor, disposición a pagar…). */
  senales: z.array(z.string()),
  /** Confianza del agente en su propio score, entero de 0 a 100. */
  confianza: z.number().int().min(0).max(100),
  /** Señales estructuradas (booleanas) que agregan los KPIs de señal de problema/pago. */
  senalesEstructuradas: senalesEstructuradasSchema,
});

export type SalidaScoring = z.infer<typeof salidaScoringSchema>;
