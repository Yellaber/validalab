import { z } from 'zod';
import { kpiSchema } from '../../ideas/umbral/kpi.catalog';

/** Juicio del agente sobre la idea (`TipoVeredicto`). */
export const tipoVeredictoSchema = z.enum(['go', 'pivote', 'kill']);
export type TipoVeredicto = z.infer<typeof tipoVeredictoSchema>;

/** Estado de verificación humana del veredicto (modo consultivo, `EstadoVeredicto`). */
export const estadoVeredictoSchema = z.enum([
  'pendiente',
  'aprobado',
  'anulado',
]);
export type EstadoVeredicto = z.infer<typeof estadoVeredictoSchema>;

/** Lectura del agente para un KPI y su peso en la conclusión (`JustificacionKpi`). */
export const justificacionKpiSchema = z.object({
  kpi: kpiSchema,
  lectura: z.string(),
});
export type JustificacionKpi = z.infer<typeof justificacionKpiSchema>;

/** Verificación humana registrada sobre el veredicto (`VerificacionVeredicto`). */
export const verificacionVeredictoSchema = z.object({
  resultado: z.enum(['aprobado', 'anulado']),
  nota: z.string().optional(),
  fecha: z.iso.datetime(),
});
export type VerificacionVeredicto = z.infer<typeof verificacionVeredictoSchema>;
