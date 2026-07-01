import { z } from 'zod';

/**
 * Catálogo estable de KPIs de validación (SRS §7). Las claves son estructurales;
 * el cálculo de sus valores reales (a partir de las entrevistas) es la épica E5.
 * Aquí solo viven la taxonomía (grupo, unidad) y los umbrales kill/go POR DEFECTO,
 * que son el criterio editable por idea (los overrides se guardan en la tabla
 * `umbrales`; ver `UmbralIdea`).
 */

/** Clave estable de un KPI (esquema `Kpi` del contrato). */
export const kpiSchema = z.enum([
  'tasa_respuesta',
  'tasa_agendamiento',
  'tasa_conversion_entrevista',
  'velocidad_pipeline',
  'volumen_evidencia',
  'cobertura_segmento',
  'score_promedio_entrevista',
  'densidad_citas',
  'tasa_confirmacion_dolor',
  'dolor_sin_solucion',
  'intensidad_dolor',
  'senal_disposicion_pago',
  'compromiso_tangible',
  'tasa_referidos',
]);
export type Kpi = z.infer<typeof kpiSchema>;

/** Grupo del embudo al que pertenece el KPI (esquema `KpiGrupo`). */
export const kpiGrupoSchema = z.enum([
  'outreach',
  'calidad_descubrimiento',
  'senal_problema',
  'senal_mercado_pago',
]);
export type KpiGrupo = z.infer<typeof kpiGrupoSchema>;

/** Cómo interpretar el valor numérico del umbral (esquema `UnidadKpi`). */
export const unidadKpiSchema = z.enum([
  'porcentaje',
  'conteo',
  'conteo_semanal',
  'ratio',
  'puntaje_0_10',
]);
export type UnidadKpi = z.infer<typeof unidadKpiSchema>;

/** Definición estructural de un KPI: su grupo, su unidad y sus defaults kill/go. */
export interface DefinicionKpi {
  grupo: KpiGrupo;
  unidad: UnidadKpi;
  umbralGo: number;
  /** `null` en los KPIs sin zona kill (p. ej. `volumen_evidencia`). */
  umbralKill: number | null;
}

/**
 * Catálogo de KPIs con sus defaults (SRS §7). Las tasas se expresan como
 * proporción 0–1. El ORDEN de este objeto define el orden del conjunto que
 * devuelve `GET /ideas/{id}/umbrales`.
 */
export const CATALOGO_KPI: Record<Kpi, DefinicionKpi> = {
  // 7.1 — alcance (outreach)
  tasa_respuesta: {
    grupo: 'outreach',
    unidad: 'porcentaje',
    umbralGo: 0.25,
    umbralKill: 0.1,
  },
  tasa_agendamiento: {
    grupo: 'outreach',
    unidad: 'porcentaje',
    umbralGo: 0.4,
    umbralKill: 0.15,
  },
  tasa_conversion_entrevista: {
    grupo: 'outreach',
    unidad: 'porcentaje',
    umbralGo: 0.1,
    umbralKill: 0.04,
  },
  velocidad_pipeline: {
    grupo: 'outreach',
    unidad: 'conteo_semanal',
    umbralGo: 3,
    umbralKill: 1,
  },
  // 7.2 — calidad del descubrimiento
  volumen_evidencia: {
    grupo: 'calidad_descubrimiento',
    unidad: 'conteo',
    umbralGo: 15,
    umbralKill: null,
  },
  cobertura_segmento: {
    grupo: 'calidad_descubrimiento',
    unidad: 'porcentaje',
    umbralGo: 0.7,
    umbralKill: 0.4,
  },
  score_promedio_entrevista: {
    grupo: 'calidad_descubrimiento',
    unidad: 'puntaje_0_10',
    umbralGo: 7,
    umbralKill: 4,
  },
  densidad_citas: {
    grupo: 'calidad_descubrimiento',
    unidad: 'porcentaje',
    umbralGo: 0.5,
    umbralKill: null,
  },
  // 7.3 — señal de problema
  tasa_confirmacion_dolor: {
    grupo: 'senal_problema',
    unidad: 'porcentaje',
    umbralGo: 0.6,
    umbralKill: 0.3,
  },
  dolor_sin_solucion: {
    grupo: 'senal_problema',
    unidad: 'porcentaje',
    umbralGo: 0.5,
    umbralKill: 0.2,
  },
  intensidad_dolor: {
    grupo: 'senal_problema',
    unidad: 'porcentaje',
    umbralGo: 0.4,
    umbralKill: 0.15,
  },
  // 7.4 — señal de mercado y pago
  senal_disposicion_pago: {
    grupo: 'senal_mercado_pago',
    unidad: 'porcentaje',
    umbralGo: 0.35,
    umbralKill: 0.15,
  },
  compromiso_tangible: {
    grupo: 'senal_mercado_pago',
    unidad: 'porcentaje',
    umbralGo: 0.3,
    umbralKill: 0.1,
  },
  tasa_referidos: {
    grupo: 'senal_mercado_pago',
    unidad: 'ratio',
    umbralGo: 0.5,
    umbralKill: 0.1,
  },
};

/** Claves del catálogo en su orden canónico (el de `CATALOGO_KPI`). */
export const KPIS: Kpi[] = Object.keys(CATALOGO_KPI) as Kpi[];

/** `true` si la clave pertenece al catálogo de KPIs. */
export function esKpiValido(clave: string): clave is Kpi {
  return clave in CATALOGO_KPI;
}
