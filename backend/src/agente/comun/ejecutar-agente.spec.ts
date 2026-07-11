import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { salidaScoringSchema } from '../scoring/esquema-scoring';
import { extraerSalidaEstructurada } from './ejecutar-agente';

/** Modelo mínimo cuyo `withStructuredOutput().invoke()` devuelve la cola indicada. */
function modeloConSalidas(...salidas: unknown[]): BaseChatModel {
  const invoke = jest.fn();
  for (const s of salidas) invoke.mockResolvedValueOnce(s);
  return {
    withStructuredOutput: () => ({ invoke }),
  } as unknown as BaseChatModel;
}

const senalesEstructuradas = {
  dolorConfirmado: true,
  dolorUrgente: false,
  sinSolucionActual: true,
  disposicionPago: false,
};

const params = (modelo: BaseChatModel, maxReintentos: number) => ({
  modelo,
  system: 'sys',
  human: 'hum',
  analisis: 'analisis',
  esquema: salidaScoringSchema,
  nombreSalida: 'PuntuacionEntrevista',
  maxReintentos,
});

describe('extraerSalidaEstructurada (runner genérico)', () => {
  it('devuelve la salida válida a la primera', async () => {
    const modelo = modeloConSalidas({
      score: 8,
      justificacion: 'ok',
      senales: ['dolor real'],
      confianza: 70,
      senalesEstructuradas,
    });

    const salida = await extraerSalidaEstructurada(params(modelo, 2));

    expect(salida.score).toBe(8);
    expect(salida.confianza).toBe(70);
    expect(salida.senalesEstructuradas.dolorConfirmado).toBe(true);
  });

  it('reintenta ante una salida inválida y acaba devolviendo la válida', async () => {
    const modelo = modeloConSalidas(
      { score: 99, justificacion: 'x', senales: [], confianza: 50 }, // fuera de rango
      {
        score: 6,
        justificacion: 'ok',
        senales: [],
        confianza: 40,
        senalesEstructuradas,
      },
    );

    const salida = await extraerSalidaEstructurada(params(modelo, 2));

    expect(salida.score).toBe(6);
  });

  it('agotados los reintentos con salida inválida, lanza error', async () => {
    const modelo = modeloConSalidas(
      { score: 99, justificacion: 'x', senales: [], confianza: 50 },
      { score: -1, justificacion: 'y', senales: [], confianza: 50 },
      { score: 20, justificacion: 'z', senales: [], confianza: 50 },
    );

    await expect(extraerSalidaEstructurada(params(modelo, 2))).rejects.toThrow(
      /no produjo una salida válida/,
    );
  });
});
