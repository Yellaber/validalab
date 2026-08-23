import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { ejecutarAgente, ResultadoAgente } from '../comun/ejecutar-agente';
import { salidaScoringSchema, SalidaScoring } from './esquema-scoring';

/** Resultado del scoring: la salida validada + telemetría del runner genérico. */
export type ResultadoScoring = ResultadoAgente<SalidaScoring>;

export interface ParamsScoring {
  modelo: BaseChatModel;
  tools: StructuredToolInterface[];
  system: string;
  human: string;
  maxIteraciones: number;
  maxReintentos: number;
  timeoutMs: number;
}

/**
 * Ejecuta el scoring de una entrevista sobre el runner agéntico genérico
 * (E4), fijando el esquema Zod de la salida de scoring.
 */
export function ejecutarScoring(
  params: ParamsScoring,
): Promise<ResultadoScoring> {
  return ejecutarAgente({
    ...params,
    esquema: salidaScoringSchema,
    nombreSalida: 'PuntuacionEntrevista',
  });
}
