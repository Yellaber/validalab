import { Moneda } from './costo.model';

/**
 * Re-evaluación en lote de las entrevistas de una idea tras un cambio de rúbrica
 * (`contrato-api/openapi.yaml`, tag `entrevistas`, épica E8b). Escrito a mano
 * reflejando el contrato.
 *
 * Es una acción **explícita**: un cambio de rúbrica no la dispara. El usuario ve
 * primero el costo estimado (sin ejecutar) y, si confirma, re-puntúa en lote las
 * entrevistas cuya entrada cambió, omitiendo por idempotencia las que no (RF-22c).
 * El costo es un estimado del consumo vía ValidaLab, no el saldo (RNF-17).
 */

/** Costo estimado de re-evaluar en lote, calculado SIN ejecutar. */
export interface EstimacionReevaluacion {
  /** Entrevistas cuya entrada cambió y que serían re-puntuadas. */
  entrevistasAfectadas: number;
  /** Modelo de scoring configurado con que se haría; `null` si no hay BYOK. */
  modeloScoring: string | null;
  moneda: Moneda;
  costoEstimado: number;
  tokensEntradaEstimados: number;
  tokensSalidaEstimados: number;
  /** Siempre `true`: es un estimado previo a la ejecución, no el saldo. */
  esEstimado: boolean;
  aclaracion: string;
}

/**
 * Solicitud de re-evaluación en lote. `idsEntrevistas` es opcional: por defecto se
 * re-evalúan todas las afectadas por el cambio; un subconjunto va explícito.
 */
export interface ReevaluacionLoteRequest {
  idsEntrevistas?: string[];
}

/** Resultado de ejecutar una re-evaluación en lote. */
export interface ResultadoReevaluacion {
  /** Entrevistas que se volvieron a puntuar. */
  entrevistasReevaluadas: number;
  /** Entrevistas sin cambios omitidas por idempotencia (RF-22c). */
  entrevistasOmitidas: number;
  moneda: Moneda;
  /** Costo estimado real del lote ejecutado (consumo vía ValidaLab, no el saldo). */
  costoEstimado: number;
  tokensEntrada: number;
  tokensSalida: number;
}
