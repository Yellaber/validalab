import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { salidaScoringSchema, SalidaScoring } from './esquema-scoring';

/** Resultado de una ejecución real del grafo, con la salida ya validada y la telemetría. */
export interface ResultadoScoring {
  salida: SalidaScoring;
  iteraciones: number;
  tokensEntrada: number | null;
  tokensSalida: number | null;
}

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
 * Ejecuta el scoring en modo real: un agente ReAct de LangGraph (grafo con bucle
 * de tools, no una llamada suelta) razona sobre la entrevista consultando las
 * tools de dominio; luego se extrae la salida ESTRUCTURADA y se valida con Zod,
 * reintentando ante una salida inválida (RF-AG-03). El `recursionLimit` y el
 * `AbortController` imponen el gobierno de ejecución (RF-AG-07/08).
 */
export async function ejecutarScoring(
  params: ParamsScoring,
): Promise<ResultadoScoring> {
  const { modelo, tools, system, human, maxIteraciones, timeoutMs } = params;
  const agente = createReactAgent({ llm: modelo, tools });

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const estado = await agente.invoke(
      {
        messages: [new SystemMessage(system), new HumanMessage(human)],
      },
      { recursionLimit: maxIteraciones, signal: controlador.signal },
    );
    const mensajes: BaseMessage[] = estado.messages ?? [];
    const analisis = ultimoTextoIA(mensajes);
    const salida = await extraerSalidaEstructurada({
      modelo,
      system,
      human,
      analisis,
      maxReintentos: params.maxReintentos,
      signal: controlador.signal,
    });
    const { tokensEntrada, tokensSalida } = sumarTokens(mensajes);
    return {
      salida,
      iteraciones: mensajes.filter((m) => m instanceof AIMessage).length,
      tokensEntrada,
      tokensSalida,
    };
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Pide al modelo la salida estructurada y la revalida con Zod, reintentando con
 * un mensaje de corrección hasta `maxReintentos`. Exportada para poder probar el
 * bucle de validación/reintento con un modelo mockeado, sin proveedor real.
 */
export async function extraerSalidaEstructurada(params: {
  modelo: BaseChatModel;
  system: string;
  human: string;
  analisis: string;
  maxReintentos: number;
  signal?: AbortSignal;
}): Promise<SalidaScoring> {
  const { modelo, system, human, analisis, maxReintentos, signal } = params;
  const estructurado = modelo.withStructuredOutput(salidaScoringSchema, {
    name: 'PuntuacionEntrevista',
  });

  let ultimoError = '';
  for (let intento = 0; intento <= maxReintentos; intento++) {
    const correccion =
      intento === 0
        ? ''
        : `\n\nTu salida anterior no cumplió el esquema (${ultimoError}). Corrige y responde SOLO con los campos válidos.`;
    const bruto = await estructurado.invoke(
      [
        new SystemMessage(system),
        new HumanMessage(
          `${human}\n\nTu análisis:\n${analisis}\n\nDevuelve ahora la puntuación estructurada.${correccion}`,
        ),
      ],
      { signal },
    );
    const parseado = salidaScoringSchema.safeParse(bruto);
    if (parseado.success) {
      return parseado.data;
    }
    ultimoError = parseado.error.issues.map((i) => i.message).join('; ');
  }
  throw new Error(
    `El agente no produjo una salida válida tras ${maxReintentos + 1} intento(s): ${ultimoError}`,
  );
}

/** Texto del último mensaje del asistente (el análisis previo a estructurar). */
function ultimoTextoIA(mensajes: BaseMessage[]): string {
  for (let i = mensajes.length - 1; i >= 0; i--) {
    const m = mensajes[i];
    if (m instanceof AIMessage) {
      return typeof m.content === 'string'
        ? m.content
        : JSON.stringify(m.content);
    }
  }
  return '';
}

/** Suma los tokens reportados por el proveedor (cuando existan) en los mensajes IA. */
function sumarTokens(mensajes: BaseMessage[]): {
  tokensEntrada: number | null;
  tokensSalida: number | null;
} {
  let entrada = 0;
  let salida = 0;
  let hubo = false;
  for (const m of mensajes) {
    const uso = (m as AIMessage).usage_metadata;
    if (uso) {
      hubo = true;
      entrada += uso.input_tokens ?? 0;
      salida += uso.output_tokens ?? 0;
    }
  }
  return hubo
    ? { tokensEntrada: entrada, tokensSalida: salida }
    : { tokensEntrada: null, tokensSalida: null };
}
