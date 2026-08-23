import { Kpi, KpiGrupo, UnidadKpi } from './umbral.model';

/**
 * Tablero de decisión y alertas de una idea (`contrato-api/openapi.yaml`, tag `kpis`).
 * Escrito a mano reflejando el contrato.
 *
 * Todo lo de aquí es **calculado por el servidor**: el cliente lee, no deriva. La
 * verdad de un KPI se reconstruye desde las entrevistas que lo originan (RNF-15), y
 * eso ocurre en el backend.
 *
 * `Kpi`, `KpiGrupo` y `UnidadKpi` se reutilizan de `umbral.model.ts`: el catálogo de
 * KPIs es uno solo, compartido con los umbrales que E2 dejó fijados.
 */

/**
 * Zona de semáforo de un KPI frente a los umbrales de la idea. `sin_datos` **no es
 * cero**: significa que no hay evidencia suficiente para calcularlo.
 */
export const ZONAS_KPI = ['go', 'observacion', 'kill', 'sin_datos'] as const;
export type ZonaKpi = (typeof ZONAS_KPI)[number];

/** Sentido del cruce de umbral que disparó una alerta. */
export const TIPOS_ALERTA = ['go', 'kill'] as const;
export type TipoAlerta = (typeof TIPOS_ALERTA)[number];

/**
 * Valor de un KPI calculado desde las entrevistas, con sus umbrales vigentes y su
 * zona. Es **autocontenido**: trae los umbrales, así que el tablero pinta el semáforo
 * sin llamar a la gestión de umbrales.
 */
export interface KpiCalculado {
  kpi: Kpi;
  grupo: KpiGrupo;
  unidad: UnidadKpi;
  /** `null` cuando no hay evidencia suficiente (denominador cero). */
  valor: number | null;
  /** Numerador de la fórmula, para transparencia; `null` en KPIs de conteo. */
  numerador: number | null;
  /** Denominador de la fórmula, para transparencia; `null` en KPIs de conteo. */
  denominador: number | null;
  umbralGo: number;
  /** `null` en los KPIs que no tienen zona kill. */
  umbralKill: number | null;
  zona: ZonaKpi;
}

/** Conteo de KPIs por zona, para una lectura global del tablero. */
export interface ResumenTablero {
  enZonaGo: number;
  enObservacion: number;
  enZonaKill: number;
  sinDatos: number;
  totalKpis: number;
}

export interface TableroIdea {
  ideaId: string;
  fechaCalculo: string;
  resumen: ResumenTablero;
  kpis: KpiCalculado[];
}

/**
 * Alerta generada **por el sistema** cuando un KPI cruza su umbral kill o go (RF-13).
 * El cliente no las crea ni las elimina: solo las lista y las marca leídas.
 */
export interface AlertaKpi {
  id: string;
  /** Idea a la que pertenece; derivado del path, nunca aceptado como entrada. */
  ideaId: string;
  kpi: Kpi;
  tipo: TipoAlerta;
  /** Valor del KPI que disparó la alerta. */
  valor: number;
  /** Umbral cruzado (go o kill, según `tipo`). */
  umbral: number;
  fecha: string;
  leida: boolean;
}

/** Marca una alerta como leída. El contrato limita el cuerpo a este campo. */
export interface ActualizarAlertaRequest {
  leida: boolean;
}
