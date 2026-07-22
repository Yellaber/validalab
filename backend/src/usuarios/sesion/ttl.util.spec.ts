import { parsearTtlMs } from './ttl.util';

describe('parsearTtlMs', () => {
  it('convierte días, horas, minutos y segundos a milisegundos', () => {
    expect(parsearTtlMs('30d')).toBe(30 * 86_400_000);
    expect(parsearTtlMs('12h')).toBe(12 * 3_600_000);
    expect(parsearTtlMs('15m')).toBe(15 * 60_000);
    expect(parsearTtlMs('45s')).toBe(45 * 1_000);
  });

  it('tolera espacios alrededor y entre número y unidad', () => {
    expect(parsearTtlMs('  30d  ')).toBe(30 * 86_400_000);
    expect(parsearTtlMs('12 h')).toBe(12 * 3_600_000);
  });

  it('lanza ante un formato inválido', () => {
    expect(() => parsearTtlMs('30')).toThrow();
    expect(() => parsearTtlMs('abc')).toThrow();
    expect(() => parsearTtlMs('10w')).toThrow();
    expect(() => parsearTtlMs('')).toThrow();
  });
});
