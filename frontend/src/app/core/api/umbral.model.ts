/**
 * Recurso `Umbral` del contrato (`contrato-api/openapi.yaml`, tag `ideas`,
 * endpoints `/ideas/{id}/umbrales`). Escrito a mano reflejando el contrato
 * (fuente de verdad).
 *
 * Los catálogos se declaran como arreglos `const` —para poder iterarlos con un
 * orden estable— y sus tipos se derivan del arreglo, de modo que arreglo y unión
 * no puedan divergir.
 */

/** Grupo del embudo al que pertenece el KPI (sección 7 del SRS), en orden. */
export const GRUPOS_KPI = [
  'outreach', // 7.1 alcance del outreach
  'calidad_descubrimiento', // 7.2 calidad del descubrimiento
  'senal_problema', // 7.3 señal de problema
  'senal_mercado_pago', // 7.4 señal de mercado y pago
] as const;
export type KpiGrupo = (typeof GRUPOS_KPI)[number];

/** Cómo interpretar el valor numérico del umbral del KPI. */
export const UNIDADES_KPI = [
  'porcentaje', // proporción 0–1 expresada como tasa (0.25 = 25%)
  'conteo', // número absoluto
  'conteo_semanal', // número por semana (velocidad de pipeline)
  'ratio', // razón sin tope
  'puntaje_0_10', // puntaje en escala 0–10
] as const;
export type UnidadKpi = (typeof UNIDADES_KPI)[number];

/**
 * Catálogo estable de KPIs de validación (sección 7 del SRS). Las claves son
 * estructurales; sus fórmulas y valores por defecto los define el dominio (E5).
 */
export const KPIS = [
  // 7.1 — alcance (outreach)
  'tasa_respuesta',
  'tasa_agendamiento',
  'tasa_conversion_entrevista',
  'velocidad_pipeline',
  // 7.2 — calidad del descubrimiento
  'volumen_evidencia',
  'cobertura_segmento',
  'score_promedio_entrevista',
  'densidad_citas',
  // 7.3 — señal de problema
  'tasa_confirmacion_dolor',
  'dolor_sin_solucion',
  'intensidad_dolor',
  // 7.4 — señal de mercado y pago
  'senal_disposicion_pago',
  'compromiso_tangible',
  'tasa_referidos',
] as const;
export type Kpi = (typeof KPIS)[number];

/**
 * Umbral kill/go de un KPI para una idea. La zona GO es `≥ umbralGo` y la KILL
 * `< umbralKill`; `umbralKill` es `null` en los KPIs sin zona kill. `grupo` y
 * `unidad` son informativos y de solo lectura: se leen de la respuesta, nunca se
 * envían ni se cablean en el cliente.
 */
export interface Umbral {
  kpi: Kpi;
  grupo: KpiGrupo;
  unidad: UnidadKpi;
  umbralGo: number;
  umbralKill: number | null;
}

/**
 * Cuerpo de `PUT /ideas/{id}/umbrales/{kpi}`. Solo los valores editables: ni
 * `kpi` (va en el path) ni `grupo`/`unidad` (solo lectura) ni `ownerId`.
 * `umbralKill` se omite en los KPIs sin zona kill y no puede superar a `umbralGo`.
 */
export interface ActualizarUmbralRequest {
  umbralGo: number;
  umbralKill?: number | null;
}
