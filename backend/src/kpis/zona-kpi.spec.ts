import { determinarZona } from './zona-kpi';

describe('determinarZona', () => {
  it('sin_datos cuando el valor es null', () => {
    expect(determinarZona(null, 0.5, 0.2)).toBe('sin_datos');
  });

  it('kill cuando el valor está por debajo del umbralKill', () => {
    expect(determinarZona(0.1, 0.5, 0.2)).toBe('kill');
  });

  it('go cuando el valor alcanza el umbralGo', () => {
    expect(determinarZona(0.5, 0.5, 0.2)).toBe('go');
    expect(determinarZona(0.8, 0.5, 0.2)).toBe('go');
  });

  it('observacion en el rango intermedio', () => {
    expect(determinarZona(0.3, 0.5, 0.2)).toBe('observacion');
  });

  it('sin zona kill (umbralKill null) solo alterna go/observacion', () => {
    expect(determinarZona(0.1, 0.5, null)).toBe('observacion');
    expect(determinarZona(0.6, 0.5, null)).toBe('go');
  });
});
