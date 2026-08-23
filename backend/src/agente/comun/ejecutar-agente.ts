import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ZodType } from 'zod';

/** Resultado de una ejecución del agente, con la salida ya validada y la telemetría. */
export interface ResultadoAgente<T> {
  salida: T;
  iteraciones: number;
  tokensEntrada: number | null;
  tokensSalida: number | null;
}

export interface ParamsAgente<T> {
  modelo: BaseChatModel;
  tools: StructuredToolInterface[];
  system: string;
  human: string;
  /** Esquema Zod de la salida estructurada esperada (scoring o veredicto). */
  esquema: ZodType<T>;
  /** Nombre de la herramienta de salida estructurada (para el binding del proveedor). */
  nombreSalida: string;
  maxIteraciones: number;
  maxReintentos: number;
  timeoutMs: number;
}

/**
 * Runner GENÉRICO de la capa agéntica (E4/E6): un agente ReAct de LangGraph
 * (grafo con bucle de tools, no una llamada suelta) razona sobre la entrada
 * consultando las tools de dominio; luego se extrae la salida ESTRUCTURADA y se
 * valida con el esquema Zod dado, reintentando ante una salida inválida
 * (RF-AG-03). El `recursionLimit` y el `AbortController` imponen el gobierno de
 * ejecución (RF-AG-07/08). Lo reutilizan el scoring y el veredicto.
 */
export async function ejecutarAgente<T>(
  params: ParamsAgente<T>,
): Promise<ResultadoAgente<T>> {
  const { modelo, tools, system, human, maxIteraciones, timeoutMs } = params;
  const agente = createReactAgent({ llm: modelo, tools });

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const estado = await agente.invoke(
      { messages: [new SystemMessage(system), new HumanMessage(human)] },
      { recursionLimit: maxIteraciones, signal: controlador.signal },
    );
    const mensajes: BaseMessage[] = estado.messages ?? [];
    const analisis = ultimoTextoIA(mensajes);
    const salida = await extraerSalidaEstructurada({
      modelo,
      system,
      human,
      analisis,
      esquema: params.esquema,
      nombreSalida: params.nombreSalida,
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
 * Pide al modelo la salida estructurada y la revalida con el esquema Zod,
 * reintentando con un mensaje de corrección hasta `maxReintentos`. Exportada para
 * probar el bucle de validación/reintento con un modelo mockeado, sin proveedor.
 */
export async function extraerSalidaEstructurada<T>(params: {
  modelo: BaseChatModel;
  system: string;
  human: string;
  analisis: string;
  esquema: ZodType<T>;
  nombreSalida: string;
  maxReintentos: number;
  signal?: AbortSignal;
}): Promise<T> {
  const { modelo, system, human, analisis, esquema, maxReintentos, signal } =
    params;
  const estructurado = modelo.withStructuredOutput(esquema, {
    name: params.nombreSalida,
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
          `${human}\n\nTu análisis:\n${analisis}\n\nDevuelve ahora la salida estructurada.${correccion}`,
        ),
      ],
      { signal },
    );
    const parseado = esquema.safeParse(bruto);
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
