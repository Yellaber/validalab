import { RespuestaEntrevista } from '../../entrevistas/entrevista/entrevista.types';
import { calcularHashScoring } from './hash-scoring';

const respuestas: RespuestaEntrevista[] = [
  { preguntaId: 'b', texto: 'segunda' },
  { preguntaId: 'a', texto: 'primera' },
];

describe('calcularHashScoring', () => {
  it('es estable e independiente del orden de captura', () => {
    const h1 = calcularHashScoring(respuestas, 'v1');
    const h2 = calcularHashScoring([...respuestas].reverse(), 'v1');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('cambia si cambia una respuesta', () => {
    const base = calcularHashScoring(respuestas, 'v1');
    const otra = calcularHashScoring(
      [{ preguntaId: 'a', texto: 'DISTINTA' }, respuestas[0]],
      'v1',
    );
    expect(otra).not.toBe(base);
  });

  it('cambia si sube la versión de rúbrica (invalida scores previos)', () => {
    expect(calcularHashScoring(respuestas, 'v1')).not.toBe(
      calcularHashScoring(respuestas, 'v2'),
    );
  });
});
