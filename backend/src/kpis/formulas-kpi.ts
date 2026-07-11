import { Contacto } from '../contactos/contacto.entity';
import { Entrevista } from '../entrevistas/entrevista/entrevista.entity';
import { Kpi } from '../ideas/umbral/kpi.catalog';

/** Valor calculado de un KPI, con numerador/denominador para transparencia. */
export interface ResultadoKpi {
  numerador: number | null;
  denominador: number | null;
  valor: number | null;
}

/** Entrada del cálculo: los datos crudos de la idea (reconstruible, RNF-15). */
export interface DatosCalculo {
  entrevistas: Entrevista[];
  contactos: Contacto[];
  segmentoBeachhead: string | null;
  ahora: Date;
}

const UNA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

/** Contactos que respondieron o avanzaron más allá (embudo acumulativo). */
const RESPONDIERON = new Set(['respondio', 'agendado', 'entrevistado']);
const AGENDARON = new Set(['agendado', 'entrevistado']);
/**
 * Estados que implican que el contacto SÍ fue contactado, aunque no se haya
 * registrado un toque explícito (p. ej. `entrevistado`, que E4 asigna directo).
 * Evita que las tasas del embudo superen 1 cuando el denominador `contactados`
 * se queda corto.
 */
const CONTACTADOS = new Set([
  'contactado',
  'respondio',
  'agendado',
  'entrevistado',
]);

/** Las cuatro señales estructuradas que agregan los KPIs de señal. */
type ClaveSenal =
  | 'dolorConfirmado'
  | 'dolorUrgente'
  | 'sinSolucionActual'
  | 'disposicionPago';

/** Ratio num/den; valor `null` (→ `sin_datos`) cuando el denominador es cero. */
function ratio(numerador: number, denominador: number): ResultadoKpi {
  return {
    numerador,
    denominador,
    valor: denominador > 0 ? numerador / denominador : null,
  };
}

/** KPI de conteo puro: sin numerador/denominador, el valor es el conteo. */
function conteo(valor: number): ResultadoKpi {
  return { numerador: null, denominador: null, valor };
}

/**
 * Calcula los 14 KPIs (SRS §7) en una sola pasada sobre las entrevistas y los
 * contactos de la idea. Las tasas se expresan como proporción 0–1. Un KPI sin
 * evidencia (denominador cero) devuelve `valor` `null` → zona `sin_datos`.
 */
export function calcularValoresKpi(
  datos: DatosCalculo,
): Record<Kpi, ResultadoKpi> {
  const { entrevistas, contactos, segmentoBeachhead, ahora } = datos;

  const puntuadas = entrevistas.filter((e) => e.estadoScoring === 'puntuada');
  const nEntrevistas = entrevistas.length;
  const nPuntuadas = puntuadas.length;
  const porId = new Map(contactos.map((c) => [c.id, c]));

  // --- Embudo (outreach) ---
  // Contactado = con un toque registrado O ya avanzado en el embudo (un contacto
  // puede llegar a `entrevistado` sin toque explícito), para que las tasas no
  // superen 1 por un denominador incompleto.
  const contactados = contactos.filter(
    (c) => c.primerToqueEn != null || CONTACTADOS.has(c.estado),
  ).length;
  const respondieron = contactos.filter((c) =>
    RESPONDIERON.has(c.estado),
  ).length;
  const agendados = contactos.filter((c) => AGENDARON.has(c.estado)).length;
  const semanas = semanasActivas(entrevistas, ahora);

  // --- Calidad del descubrimiento ---
  const conCita = entrevistas.filter((e) => e.citas.length > 0).length;
  const scores = puntuadas
    .map((e) => e.ajuste?.scoreAjustado ?? e.score?.score)
    .filter((s): s is number => typeof s === 'number');
  const cobertura = coberturaSegmento(entrevistas, porId, segmentoBeachhead);

  // --- Señal de problema / mercado y pago ---
  const conSenal = (clave: ClaveSenal): number =>
    puntuadas.filter((e) => e.score?.senalesEstructuradas?.[clave] === true)
      .length;

  const referidos = contactos.filter((c) => c.referidoPorId != null).length;
  const idsReferentes = new Set(
    contactos
      .map((c) => c.referidoPorId)
      .filter((id): id is string => id != null),
  );
  const tangibles = contactos.filter(
    (c) => c.estado === 'entrevistado' || idsReferentes.has(c.id),
  ).length;

  return {
    // 7.1 — alcance
    tasa_respuesta: ratio(respondieron, contactados),
    tasa_agendamiento: ratio(agendados, respondieron),
    tasa_conversion_entrevista: ratio(nEntrevistas, contactados),
    velocidad_pipeline:
      nEntrevistas > 0
        ? {
            numerador: nEntrevistas,
            denominador: semanas,
            valor: nEntrevistas / semanas,
          }
        : { numerador: 0, denominador: semanas, valor: null },
    // 7.2 — calidad del descubrimiento
    volumen_evidencia: conteo(nEntrevistas),
    cobertura_segmento: cobertura,
    score_promedio_entrevista: scores.length
      ? {
          numerador: scores.reduce((a, b) => a + b, 0),
          denominador: scores.length,
          valor: scores.reduce((a, b) => a + b, 0) / scores.length,
        }
      : { numerador: null, denominador: 0, valor: null },
    densidad_citas: ratio(conCita, nEntrevistas),
    // 7.3 — señal de problema
    tasa_confirmacion_dolor: ratio(conSenal('dolorConfirmado'), nPuntuadas),
    dolor_sin_solucion: ratio(conSenal('sinSolucionActual'), nPuntuadas),
    intensidad_dolor: ratio(conSenal('dolorUrgente'), nPuntuadas),
    // 7.4 — señal de mercado y pago
    senal_disposicion_pago: ratio(conSenal('disposicionPago'), nPuntuadas),
    compromiso_tangible: ratio(tangibles, contactos.length),
    tasa_referidos: ratio(referidos, nEntrevistas),
  };
}

/** Semanas activas del pipeline: desde la primera entrevista hasta hoy (mínimo 1). */
function semanasActivas(entrevistas: Entrevista[], ahora: Date): number {
  if (entrevistas.length === 0) {
    return 1;
  }
  const primera = Math.min(
    ...entrevistas.map((e) => e.fechaCreacion.getTime()),
  );
  const semanas = (ahora.getTime() - primera) / UNA_SEMANA_MS;
  return Math.max(1, semanas);
}

/**
 * Cobertura del segmento beachhead: entrevistas cuyo contacto tiene un `perfil`
 * que coincide (contiene, case-insensitive) con el `segmentoBeachhead` de la
 * idea, sobre el total de entrevistas. Sin beachhead definido → `sin_datos`.
 */
function coberturaSegmento(
  entrevistas: Entrevista[],
  porId: Map<string, Contacto>,
  segmentoBeachhead: string | null,
): ResultadoKpi {
  const objetivo = segmentoBeachhead?.trim().toLowerCase();
  if (!objetivo) {
    return { numerador: null, denominador: null, valor: null };
  }
  const enSegmento = entrevistas.filter((e) => {
    const perfil = porId.get(e.contactoId)?.perfil?.trim().toLowerCase();
    return perfil ? perfil.includes(objetivo) : false;
  }).length;
  return ratio(enSegmento, entrevistas.length);
}
