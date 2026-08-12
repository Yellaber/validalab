import { GRUPOS_KPI, Kpi, KpiGrupo } from '../../../core/api/umbral.model';

/**
 * Etiquetas legibles del catálogo de KPIs. Es lo **único** local: la
 * correspondencia KPI→grupo y KPI→unidad se lee siempre de la respuesta del
 * contrato, nunca de aquí. Si el catálogo crece, la vista sigue renderizando y
 * solo degrada a la clave cruda (ver `nombreKpi`).
 */

export interface EtiquetaKpi {
  nombre: string;
  /** Qué mide, en una línea, para orientar al fijar el listón. */
  formula: string;
}

export const ETIQUETA_KPI: Record<Kpi, EtiquetaKpi> = {
  // 7.1 — alcance (outreach)
  tasa_respuesta: {
    nombre: 'Tasa de respuesta',
    formula: 'Contactos que respondieron / contactados',
  },
  tasa_agendamiento: {
    nombre: 'Tasa de agendamiento',
    formula: 'Entrevistas agendadas / contactos que respondieron',
  },
  tasa_conversion_entrevista: {
    nombre: 'Conversión a entrevista',
    formula: 'Entrevistas realizadas / contactos contactados',
  },
  velocidad_pipeline: {
    nombre: 'Velocidad del pipeline',
    formula: 'Entrevistas realizadas por semana',
  },
  // 7.2 — calidad del descubrimiento
  volumen_evidencia: {
    nombre: 'Volumen de evidencia',
    formula: 'Entrevistas válidas de la idea',
  },
  cobertura_segmento: {
    nombre: 'Cobertura del segmento',
    formula: 'Entrevistas al perfil beachhead / total',
  },
  score_promedio_entrevista: {
    nombre: 'Score promedio de entrevista',
    formula: 'Promedio del score (0–10), con tus ajustes',
  },
  densidad_citas: {
    nombre: 'Densidad de citas',
    formula: 'Entrevistas con cita textual de dolor / total',
  },
  // 7.3 — señal de problema
  tasa_confirmacion_dolor: {
    nombre: 'Confirmación del dolor',
    formula: 'Entrevistas que confirman el dolor / total',
  },
  dolor_sin_solucion: {
    nombre: 'Dolor sin solución',
    formula: 'Entrevistados sin solución que les sirva / total',
  },
  intensidad_dolor: {
    nombre: 'Intensidad del dolor',
    formula: "Entrevistas que lo califican como 'urgente' / total",
  },
  // 7.4 — señal de mercado y pago
  senal_disposicion_pago: {
    nombre: 'Disposición a pagar',
    formula: 'Entrevistas con interés explícito en pagar / total',
  },
  compromiso_tangible: {
    nombre: 'Compromiso tangible',
    formula: 'Contactos que ceden tiempo, datos o un referido / total',
  },
  tasa_referidos: {
    nombre: 'Tasa de referidos',
    formula: 'Referidos obtenidos / entrevistas realizadas',
  },
};

export const ETIQUETA_GRUPO: Record<KpiGrupo, { nombre: string; contexto: string }> = {
  outreach: {
    nombre: 'Alcance del outreach',
    contexto: 'Qué tan bien llegas a las personas que quieres entrevistar.',
  },
  calidad_descubrimiento: {
    nombre: 'Calidad del descubrimiento',
    contexto: 'Si la evidencia que reúnes es suficiente y del perfil correcto.',
  },
  senal_problema: {
    nombre: 'Señal de problema',
    contexto: 'Qué tan real y urgente resulta el problema para los entrevistados.',
  },
  senal_mercado_pago: {
    nombre: 'Señal de mercado y pago',
    contexto: 'Si hay disposición a pagar y compromiso más allá de las palabras.',
  },
};

/** Orden de presentación de los grupos, según la sección 7 del SRS. */
export const ORDEN_GRUPOS: readonly KpiGrupo[] = GRUPOS_KPI;

/** Nombre legible de un KPI; degrada a su clave cruda si no está catalogado. */
export function nombreKpi(kpi: string): string {
  return ETIQUETA_KPI[kpi as Kpi]?.nombre ?? kpi;
}

/** Fórmula legible de un KPI; vacía si no está catalogado. */
export function formulaKpi(kpi: string): string {
  return ETIQUETA_KPI[kpi as Kpi]?.formula ?? '';
}

/** Nombre legible de un grupo; degrada a su clave cruda si no está catalogado. */
export function nombreGrupo(grupo: string): string {
  return ETIQUETA_GRUPO[grupo as KpiGrupo]?.nombre ?? grupo;
}

/** Contexto de un grupo; vacío si no está catalogado. */
export function contextoGrupo(grupo: string): string {
  return ETIQUETA_GRUPO[grupo as KpiGrupo]?.contexto ?? '';
}
