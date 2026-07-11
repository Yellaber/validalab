import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  kpiGrupoSchema,
  kpiSchema,
  unidadKpiSchema,
} from '../ideas/umbral/kpi.catalog';
import { zonaKpiSchema } from './zona-kpi';

/**
 * Esquemas de respuesta del tablero de KPIs (E5). Reproducen `KpiCalculado`,
 * `ResumenTablero` y `TableroIdea` del contrato. Un `KpiCalculado` es
 * autocontenido: trae sus umbrales vigentes y su zona para pintar el semáforo sin
 * otra llamada.
 */
export const kpiCalculadoSchema = z.object({
  kpi: kpiSchema,
  grupo: kpiGrupoSchema,
  unidad: unidadKpiSchema,
  valor: z.number().nullable(),
  numerador: z.number().nullable(),
  denominador: z.number().nullable(),
  umbralGo: z.number(),
  umbralKill: z.number().nullable(),
  zona: zonaKpiSchema,
});
export type KpiCalculado = z.infer<typeof kpiCalculadoSchema>;

export const resumenTableroSchema = z.object({
  enZonaGo: z.number().int(),
  enObservacion: z.number().int(),
  enZonaKill: z.number().int(),
  sinDatos: z.number().int(),
  totalKpis: z.number().int(),
});
export type ResumenTablero = z.infer<typeof resumenTableroSchema>;

export const tableroIdeaSchema = z.object({
  ideaId: z.uuid(),
  fechaCalculo: z.iso.datetime(),
  resumen: resumenTableroSchema,
  kpis: z.array(kpiCalculadoSchema),
});
export type TableroIdea = z.infer<typeof tableroIdeaSchema>;
export class TableroIdeaDto extends createZodDto(tableroIdeaSchema) {}

/** Conteo de KPIs por zona de semáforo, para la lectura global del tablero. */
export function resumirTablero(kpis: KpiCalculado[]): ResumenTablero {
  return {
    enZonaGo: kpis.filter((k) => k.zona === 'go').length,
    enObservacion: kpis.filter((k) => k.zona === 'observacion').length,
    enZonaKill: kpis.filter((k) => k.zona === 'kill').length,
    sinDatos: kpis.filter((k) => k.zona === 'sin_datos').length,
    totalKpis: kpis.length,
  };
}
