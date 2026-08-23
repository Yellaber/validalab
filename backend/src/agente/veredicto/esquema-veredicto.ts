import { z } from 'zod';
import { justificacionKpiSchema, tipoVeredictoSchema } from './veredicto.types';

/**
 * Esquema de la salida CRUDA del agente al emitir un veredicto (RF-AG-02). Es el
 * contrato mínimo que el modelo DEBE cumplir; se revalida antes de persistir y se
 * reintenta ante una salida inválida (RF-AG-03 → 502 en la operación síncrona).
 * Los metadatos (proveedor, modelo, snapshot) los añade el servicio.
 */
export const salidaVeredictoSchema = z.object({
  /** Juicio sobre la idea. */
  veredicto: tipoVeredictoSchema,
  /** Confianza del agente en su juicio, entero de 0 a 100. */
  confianza: z.number().int().min(0).max(100),
  /** Lectura del agente por cada KPI relevante y su peso en la conclusión. */
  justificacionPorKPI: z.array(justificacionKpiSchema),
  /** Acciones sugeridas por el agente. */
  recomendaciones: z.array(z.string()),
});

export type SalidaVeredicto = z.infer<typeof salidaVeredictoSchema>;
