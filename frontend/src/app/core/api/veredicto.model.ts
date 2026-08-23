import { Kpi } from './umbral.model';
import { KpiCalculado } from './kpi.model';

/**
 * Veredicto del Validador Inteligente sobre una idea (`contrato-api/openapi.yaml`,
 * tag `agente`, épica E6). Escrito a mano reflejando el contrato.
 *
 * **Modo consultivo:** el agente propone, el humano dispone. El bloque del agente
 * (`veredicto`, `confianza`, `justificacionPorKPI`, `recomendaciones`, `proveedor`,
 * `modelo`) y el `snapshotKpis` son de **solo lectura** (RNF-09, RNF-20); la idea
 * solo cambia de estado tras la verificación humana. Se conservan siempre ambas
 * versiones —la del agente y la del usuario— aunque difieran.
 *
 * `Kpi` se reutiliza de `umbral.model.ts` y `KpiCalculado` de `kpi.model.ts`: el
 * snapshot congela los mismos KPIs que pinta el tablero (E5).
 */

/** Juicio del agente sobre la idea. */
export const TIPOS_VEREDICTO = ['go', 'pivote', 'kill'] as const;
export type TipoVeredicto = (typeof TIPOS_VEREDICTO)[number];

/** Estado de verificación humana del veredicto (modo consultivo). */
export const ESTADOS_VEREDICTO = ['pendiente', 'aprobado', 'anulado'] as const;
export type EstadoVeredicto = (typeof ESTADOS_VEREDICTO)[number];

/** Lectura del agente para un KPI y su peso en la conclusión (RF-15, HU-19). */
export interface JustificacionKpi {
  kpi: Kpi;
  /** Cómo interpreta el agente este KPI y cómo influye en el veredicto. */
  lectura: string;
}

/** Verificación humana registrada sobre el veredicto (solo lectura). */
export interface VerificacionVeredicto {
  resultado: 'aprobado' | 'anulado';
  /** Motivo de la verificación; obligatoria al anular. */
  nota?: string;
  fecha: string;
}

/**
 * Veredicto razonado del agente sobre una idea, con su snapshot reproducible y su
 * verificación humana. Todo el bloque del agente y el snapshot son de solo lectura.
 */
export interface Veredicto {
  id: string;
  /** Idea a la que pertenece; derivado del path, nunca aceptado como entrada. */
  ideaId: string;
  veredicto: TipoVeredicto;
  /** Confianza del agente (0–100); evidencia escasa produce confianza baja. */
  confianza: number;
  justificacionPorKPI: JustificacionKpi[];
  /** Acciones sugeridas por el agente. */
  recomendaciones: string[];
  /** Proveedor de IA con que se emitió (snapshot, RNF-09). */
  proveedor: string;
  /** Modelo concreto con que se emitió (snapshot, RNF-09). */
  modelo: string;
  /** KPIs (valores, umbrales y zona) sobre los que se emitió, congelados. */
  snapshotKpis: KpiCalculado[];
  estadoVerificacion: EstadoVeredicto;
  /** Verificación humana; `null` mientras el veredicto está `pendiente`. */
  verificacion: VerificacionVeredicto | null;
  fechaEmision: string;
}

/**
 * Verificación humana del veredicto. `aprobado` lo hace firme y cambia el estado de
 * la idea; `anulado` exige `nota` y no cambia el estado. El cliente nunca envía
 * `ideaId` ni el bloque del agente: solo el resultado y, si anula, el motivo.
 */
export interface VerificarVeredictoRequest {
  resultado: 'aprobado' | 'anulado';
  /** Motivo de la verificación; obligatorio cuando `resultado` es `anulado`. */
  nota?: string;
}
