import { esTransicionValida, TRANSICIONES } from './embudo';

describe('Embudo de outreach (TRANSICIONES)', () => {
  it('permite el avance lineal del embudo', () => {
    expect(esTransicionValida('por_contactar', 'contactado')).toBe(true);
    expect(esTransicionValida('contactado', 'respondio')).toBe(true);
    expect(esTransicionValida('respondio', 'agendado')).toBe(true);
  });

  it('permite descartar desde cualquier estado no terminal', () => {
    for (const estado of [
      'por_contactar',
      'contactado',
      'respondio',
      'agendado',
    ] as const) {
      expect(esTransicionValida(estado, 'descartado')).toBe(true);
    }
  });

  it('nunca permite ir a entrevistado por transición manual (reservado a E4)', () => {
    for (const estado of Object.keys(
      TRANSICIONES,
    ) as (keyof typeof TRANSICIONES)[]) {
      expect(esTransicionValida(estado, 'entrevistado')).toBe(false);
    }
  });

  it('rechaza saltos de estado', () => {
    expect(esTransicionValida('por_contactar', 'agendado')).toBe(false);
    expect(esTransicionValida('por_contactar', 'respondio')).toBe(false);
  });

  it('los estados terminales no tienen transiciones de salida', () => {
    expect(TRANSICIONES.entrevistado).toHaveLength(0);
    expect(TRANSICIONES.descartado).toHaveLength(0);
  });
});
