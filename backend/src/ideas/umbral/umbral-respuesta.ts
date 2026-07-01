import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  CATALOGO_KPI,
  Kpi,
  kpiGrupoSchema,
  kpiSchema,
  unidadKpiSchema,
} from './kpi.catalog';
import { UmbralIdea } from './umbral.entity';

/**
 * Esquemas de respuesta de los umbrales. Reproducen el recurso `Umbral` del
 * contrato: `grupo` y `unidad` son informativos (del catálogo), `umbralGo`/
 * `umbralKill` son los valores VIGENTES (override de la idea o default).
 */
export const umbralRespuestaSchema = z.object({
  kpi: kpiSchema,
  grupo: kpiGrupoSchema,
  unidad: unidadKpiSchema,
  umbralGo: z.number(),
  umbralKill: z.number().nullable(),
});
export type UmbralRespuesta = z.infer<typeof umbralRespuestaSchema>;
export class UmbralRespuestaDto extends createZodDto(umbralRespuestaSchema) {}

/** Conjunto `UmbralesIdea`: un `Umbral` por cada KPI del catálogo. */
export const umbralesIdeaSchema = z.array(umbralRespuestaSchema);
export class UmbralesIdeaDto extends createZodDto(umbralesIdeaSchema) {}

/**
 * Compone el `Umbral` vigente de un KPI: `grupo`/`unidad` y defaults del
 * catálogo, sobrescritos por el `override` de la idea si existe.
 */
export function aUmbralDto(kpi: Kpi, override?: UmbralIdea): UmbralRespuesta {
  const definicion = CATALOGO_KPI[kpi];
  return {
    kpi,
    grupo: definicion.grupo,
    unidad: definicion.unidad,
    umbralGo: override ? override.umbralGo : definicion.umbralGo,
    umbralKill: override ? override.umbralKill : definicion.umbralKill,
  };
}
