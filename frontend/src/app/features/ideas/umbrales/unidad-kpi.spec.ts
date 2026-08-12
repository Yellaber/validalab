import {
  aPresentacion,
  aTransporte,
  formatoDe,
  motivoFueraDeRango,
  parsear,
  textoDe,
} from './unidad-kpi';

describe('unidad-kpi', () => {
  describe('porcentaje: tasa 0–1 en el contrato, puntos porcentuales en la UI', () => {
    it('convierte la tasa del contrato a puntos porcentuales', () => {
      expect(aPresentacion(0.25, 'porcentaje')).toBe(25);
      expect(aPresentacion(0.125, 'porcentaje')).toBe(12.5);
      expect(aPresentacion(0, 'porcentaje')).toBe(0);
      expect(aPresentacion(1, 'porcentaje')).toBe(100);
    });

    it('convierte los puntos porcentuales a la tasa del contrato', () => {
      expect(aTransporte(25, 'porcentaje')).toBe(0.25);
      expect(aTransporte(30, 'porcentaje')).toBe(0.3);
      expect(aTransporte(12.5, 'porcentaje')).toBe(0.125);
    });

    it('la ida y vuelta no arrastra ruido de coma flotante', () => {
      for (const tasa of [0.07, 0.1, 0.15, 0.2, 0.25, 0.29, 0.3, 0.33, 0.5, 0.7, 0.99]) {
        expect(aTransporte(aPresentacion(tasa, 'porcentaje'), 'porcentaje')).toBe(tasa);
      }
    });

    it('el texto del control se muestra en puntos porcentuales', () => {
      expect(textoDe(0.25, 'porcentaje')).toBe('25');
      expect(textoDe(null, 'porcentaje')).toBe('');
    });
  });

  describe('unidades sin conversión', () => {
    it('conteo, conteo_semanal, ratio y puntaje viajan en crudo', () => {
      expect(aPresentacion(15, 'conteo')).toBe(15);
      expect(aTransporte(15, 'conteo')).toBe(15);
      expect(aPresentacion(3, 'conteo_semanal')).toBe(3);
      expect(aTransporte(1.25, 'ratio')).toBe(1.25);
      expect(aTransporte(7.5, 'puntaje_0_10')).toBe(7.5);
    });

    it('una unidad desconocida degrada al formato más permisivo, sin convertir', () => {
      expect(aPresentacion(4.2, 'unidad_futura')).toBe(4.2);
      expect(aTransporte(4.2, 'unidad_futura')).toBe(4.2);
      expect(formatoDe('unidad_futura')).toEqual(formatoDe('ratio'));
    });
  });

  describe('parsear', () => {
    it('devuelve null para texto vacío o no numérico', () => {
      expect(parsear('')).toBeNull();
      expect(parsear('   ')).toBeNull();
      expect(parsear('abc')).toBeNull();
    });

    it('acepta enteros y decimales', () => {
      expect(parsear('25')).toBe(25);
      expect(parsear(' 12.5 ')).toBe(12.5);
      expect(parsear('0')).toBe(0);
    });
  });

  describe('motivoFueraDeRango', () => {
    it('rechaza valores negativos', () => {
      expect(motivoFueraDeRango(-1, 'porcentaje')).toContain('menor que 0');
    });

    it('acota el porcentaje a 100 y el puntaje a 10', () => {
      expect(motivoFueraDeRango(120, 'porcentaje')).toContain('mayor que 100');
      expect(motivoFueraDeRango(11, 'puntaje_0_10')).toContain('mayor que 10');
    });

    it('exige enteros en los conteos', () => {
      expect(motivoFueraDeRango(2.5, 'conteo')).toContain('entero');
      expect(motivoFueraDeRango(2.5, 'conteo_semanal')).toContain('entero');
      expect(motivoFueraDeRango(15, 'conteo')).toBeNull();
    });

    it('no pone tope a conteos ni ratios', () => {
      expect(motivoFueraDeRango(9999, 'conteo')).toBeNull();
      expect(motivoFueraDeRango(9999.5, 'ratio')).toBeNull();
    });

    it('rechaza más decimales de los que la unidad puede guardar', () => {
      // La precisión mostrada es también la que se puede persistir: admitir más
      // decimales y truncarlos al convertir cambiaría el valor a espaldas del usuario.
      expect(motivoFueraDeRango(33.33, 'porcentaje')).toContain('1 decimal');
      expect(motivoFueraDeRango(7.55, 'puntaje_0_10')).toContain('1 decimal');
      expect(motivoFueraDeRango(1.234, 'ratio')).toContain('2 decimales');
    });

    it('acepta la precisión justa que la unidad admite', () => {
      expect(motivoFueraDeRango(33.3, 'porcentaje')).toBeNull();
      expect(motivoFueraDeRango(25, 'porcentaje')).toBeNull();
      expect(motivoFueraDeRango(7.5, 'puntaje_0_10')).toBeNull();
      expect(motivoFueraDeRango(1.23, 'ratio')).toBeNull();
    });

    it('todo valor que llega del contrato pasa su propia validación', () => {
      // `aPresentacion` redondea a la precisión de la unidad, así que un valor
      // vigente nunca puede quedar bloqueado por la regla de decimales.
      for (const tasa of [0.3333, 0.1155, 0.6667, 0.25]) {
        expect(motivoFueraDeRango(aPresentacion(tasa, 'porcentaje'), 'porcentaje')).toBeNull();
      }
    });
  });
});
