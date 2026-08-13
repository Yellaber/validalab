import { Contacto, ESTADOS_OUTREACH } from '../../../core/api/contacto.model';
import {
  ESTADOS_FILTRO,
  alcanzoLimiteDeToques,
  destinosAlcanzables,
  etiquetaCanal,
  etiquetaEstado,
  etiquetaOrigen,
  toquesDe,
} from './embudo';

function contacto(parcial: Partial<Contacto> = {}): Contacto {
  return {
    id: 'c1',
    ideaId: 'i1',
    nombre: 'Ana Ruiz',
    canal: 'linkedin',
    origen: 'busqueda_directa',
    estado: 'por_contactar',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    ...parcial,
  };
}

describe('embudo', () => {
  describe('destinosAlcanzables', () => {
    it('nunca ofrece entrevistado, en ningún estado', () => {
      for (const estado of ESTADOS_OUTREACH) {
        expect(destinosAlcanzables(estado)).not.toContain('entrevistado');
      }
    });

    it('ofrece el siguiente del embudo más descartado', () => {
      expect(destinosAlcanzables('por_contactar')).toEqual(['contactado', 'descartado']);
      expect(destinosAlcanzables('contactado')).toEqual(['respondio', 'descartado']);
      expect(destinosAlcanzables('respondio')).toEqual(['agendado', 'descartado']);
    });

    it('desde agendado solo queda descartar, porque el siguiente lo fija E4', () => {
      expect(destinosAlcanzables('agendado')).toEqual(['descartado']);
    });

    it('los estados terminales no ofrecen destino', () => {
      expect(destinosAlcanzables('entrevistado')).toEqual([]);
      expect(destinosAlcanzables('descartado')).toEqual([]);
    });
  });

  describe('ESTADOS_FILTRO', () => {
    it('incluye los seis estados, entrevistado entre ellos', () => {
      // Filtrar por `entrevistado` es legítimo aunque no se pueda transicionar allí.
      expect(ESTADOS_FILTRO).toHaveLength(6);
      expect(ESTADOS_FILTRO).toContain('entrevistado');
    });
  });

  describe('toques', () => {
    it('cuenta los toques a partir de las dos fechas del contrato', () => {
      expect(toquesDe(contacto())).toBe(0);
      expect(toquesDe(contacto({ primerToqueEn: '2026-03-12T10:00:00.000Z' }))).toBe(1);
      expect(
        toquesDe(
          contacto({
            primerToqueEn: '2026-03-12T10:00:00.000Z',
            segundoToqueEn: '2026-03-19T10:00:00.000Z',
          }),
        ),
      ).toBe(2);
    });

    it('el límite se alcanza con dos toques', () => {
      expect(alcanzoLimiteDeToques(contacto())).toBe(false);
      expect(alcanzoLimiteDeToques(contacto({ primerToqueEn: '2026-03-12T10:00:00.000Z' }))).toBe(
        false,
      );
      expect(
        alcanzoLimiteDeToques(
          contacto({
            primerToqueEn: '2026-03-12T10:00:00.000Z',
            segundoToqueEn: '2026-03-19T10:00:00.000Z',
          }),
        ),
      ).toBe(true);
    });
  });

  describe('etiquetas', () => {
    it('traducen los catálogos del contrato', () => {
      expect(etiquetaEstado('por_contactar')).toBe('Por contactar');
      expect(etiquetaCanal('linkedin')).toBe('LinkedIn');
      expect(etiquetaOrigen('busqueda_directa')).toBe('Búsqueda directa');
    });

    it('degradan a la clave cruda si el catálogo crece', () => {
      expect(etiquetaEstado('estado_futuro')).toBe('estado_futuro');
      expect(etiquetaCanal('canal_futuro')).toBe('canal_futuro');
      expect(etiquetaOrigen('origen_futuro')).toBe('origen_futuro');
    });
  });
});
