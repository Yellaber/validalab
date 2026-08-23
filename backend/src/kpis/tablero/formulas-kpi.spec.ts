import { Contacto } from '../../contactos/contacto.entity';
import { Entrevista } from '../../entrevistas/entrevista/entrevista.entity';
import { SenalesEstructuradas } from '../../entrevistas/entrevista/entrevista.types';
import { calcularValoresKpi, DatosCalculo } from './formulas-kpi';

const SIN_SENAL: SenalesEstructuradas = {
  dolorConfirmado: false,
  dolorUrgente: false,
  sinSolucionActual: false,
  disposicionPago: false,
};

function contacto(p: Partial<Contacto>): Contacto {
  return {
    id: 'c',
    ideaId: 'i',
    nombre: 'C',
    perfil: null,
    canal: 'email',
    origen: 'directo',
    referidoPorId: null,
    estado: 'por_contactar',
    primerToqueEn: null,
    segundoToqueEn: null,
    ...p,
  } as Contacto;
}

function entrevista(p: Partial<Entrevista>): Entrevista {
  return {
    id: 'e',
    ideaId: 'i',
    contactoId: 'c',
    guionId: 'g',
    respuestas: [],
    citas: [],
    estadoScoring: 'puntuada',
    score: null,
    ajuste: null,
    fechaCreacion: new Date('2026-07-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-07-01T00:00:00.000Z'),
    ...p,
  } as Entrevista;
}

function datos(p: Partial<DatosCalculo>): DatosCalculo {
  return {
    entrevistas: [],
    contactos: [],
    segmentoBeachhead: null,
    ahora: new Date('2026-07-15T00:00:00.000Z'),
    ...p,
  };
}

describe('calcularValoresKpi — outreach', () => {
  it('tasa_respuesta = respondieron / contactados (por primerToqueEn)', () => {
    const contactos = [
      contacto({ id: 'a', primerToqueEn: new Date(), estado: 'respondio' }),
      contacto({ id: 'b', primerToqueEn: new Date(), estado: 'agendado' }),
      contacto({ id: 'd', primerToqueEn: new Date(), estado: 'contactado' }),
      contacto({ id: 'e', primerToqueEn: null, estado: 'por_contactar' }),
    ];
    const v = calcularValoresKpi(datos({ contactos }));
    // 2 respondieron (respondio, agendado) sobre 3 contactados
    expect(v.tasa_respuesta.valor).toBeCloseTo(2 / 3);
    expect(v.tasa_respuesta.numerador).toBe(2);
    expect(v.tasa_respuesta.denominador).toBe(3);
  });

  it('denominador cero → valor null (sin_datos)', () => {
    const v = calcularValoresKpi(datos({}));
    expect(v.tasa_respuesta.valor).toBeNull();
  });
});

describe('calcularValoresKpi — calidad del descubrimiento', () => {
  it('volumen_evidencia es un conteo y densidad_citas una proporción', () => {
    const entrevistas = [
      entrevista({ id: '1', citas: [{ id: 'x', texto: 't' }] }),
      entrevista({ id: '2', citas: [] }),
    ];
    const v = calcularValoresKpi(datos({ entrevistas }));
    expect(v.volumen_evidencia.valor).toBe(2);
    expect(v.densidad_citas.valor).toBeCloseTo(0.5);
  });

  it('score_promedio usa el ajuste del usuario cuando existe', () => {
    const entrevistas = [
      entrevista({
        id: '1',
        score: { score: 8, justificacion: '', senales: [], confianza: 90 },
        ajuste: {
          scoreAjustado: 3,
          nota: 'optimista',
          fechaAjuste: '2026-07-02T00:00:00.000Z',
        },
      }),
      entrevista({
        id: '2',
        score: { score: 6, justificacion: '', senales: [], confianza: 90 },
      }),
    ];
    const v = calcularValoresKpi(datos({ entrevistas }));
    // usa 3 (ajuste) y 6 (agente) → promedio 4.5
    expect(v.score_promedio_entrevista.valor).toBeCloseTo(4.5);
  });

  it('cobertura_segmento es sin_datos sin beachhead, y coincide por perfil', () => {
    const contactos = [
      contacto({ id: 'a', perfil: 'CTO de startup' }),
      contacto({ id: 'b', perfil: 'diseñador' }),
    ];
    const entrevistas = [
      entrevista({ id: '1', contactoId: 'a' }),
      entrevista({ id: '2', contactoId: 'b' }),
    ];
    expect(
      calcularValoresKpi(datos({ contactos, entrevistas })).cobertura_segmento
        .valor,
    ).toBeNull();
    const v = calcularValoresKpi(
      datos({ contactos, entrevistas, segmentoBeachhead: 'CTO' }),
    );
    expect(v.cobertura_segmento.valor).toBeCloseTo(0.5);
  });
});

describe('calcularValoresKpi — señales estructuradas', () => {
  it('tasa_confirmacion_dolor agrega la señal sobre las puntuadas', () => {
    const entrevistas = [
      entrevista({
        id: '1',
        score: {
          score: 7,
          justificacion: '',
          senales: [],
          confianza: 80,
          senalesEstructuradas: { ...SIN_SENAL, dolorConfirmado: true },
        },
      }),
      entrevista({
        id: '2',
        score: {
          score: 4,
          justificacion: '',
          senales: [],
          confianza: 80,
          senalesEstructuradas: SIN_SENAL,
        },
      }),
    ];
    const v = calcularValoresKpi(datos({ entrevistas }));
    expect(v.tasa_confirmacion_dolor.valor).toBeCloseTo(0.5);
  });

  it('una entrevista puntuada sin señales estructuradas cuenta como false', () => {
    const entrevistas = [
      entrevista({
        id: '1',
        score: { score: 7, justificacion: '', senales: [], confianza: 80 },
      }),
    ];
    const v = calcularValoresKpi(datos({ entrevistas }));
    expect(v.tasa_confirmacion_dolor.valor).toBe(0);
  });
});

describe('calcularValoresKpi — mercado y pago', () => {
  it('tasa_referidos = referidos / entrevistas; compromiso incluye entrevistados y referentes', () => {
    const contactos = [
      contacto({ id: 'a', estado: 'entrevistado' }),
      contacto({ id: 'b', referidoPorId: 'a' }),
      contacto({ id: 'c2', estado: 'contactado' }),
    ];
    const entrevistas = [entrevista({ id: '1', contactoId: 'a' })];
    const v = calcularValoresKpi(datos({ contactos, entrevistas }));
    // 1 referido / 1 entrevista
    expect(v.tasa_referidos.valor).toBeCloseTo(1);
    // tangibles: 'a' (entrevistado) + 'a' es referente de 'b' → set {a}; total contactos 3
    expect(v.compromiso_tangible.numerador).toBe(1);
    expect(v.compromiso_tangible.denominador).toBe(3);
  });
});
