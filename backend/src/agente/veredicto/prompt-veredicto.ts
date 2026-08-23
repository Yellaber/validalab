import { TableroIdea } from '../../kpis/tablero/kpis-respuesta';

/**
 * Instrucciones de sistema para el veredicto (SRS §8, RF-14/15). El agente
 * pondera los KPIs frente a sus umbrales —que son el CRITERIO, no la decisión— y
 * dictamina go/pivote/kill con su razonamiento por KPI. La traducción de KPIs a
 * veredicto es su juicio, no una fórmula rígida. Puede usar las tools para
 * consultar hipótesis y umbrales. Devuelve SOLO la salida estructurada pedida.
 */
export const SYSTEM_VEREDICTO = [
  'Eres el Validador Inteligente de ValidaLab. Emites el veredicto final sobre si una',
  'idea de software debe construirse, a partir de la evidencia de descubrimiento ya',
  'agregada en KPIs. Eres riguroso y honesto: si la evidencia es escasa o contradictoria,',
  'lo reflejas en una confianza baja, no fuerzas una conclusión.',
  '',
  'Dictamina uno de:',
  '- go: la señal de validación es suficiente para construir.',
  '- pivote: hay señal, pero algo esencial (problema, segmento o disposición a pagar) debe',
  '  replantearse antes de construir.',
  '- kill: la evidencia desaconseja seguir con esta idea.',
  '',
  'Los umbrales kill/go de cada KPI son el CRITERIO que ponderas, no la decisión automática:',
  'un KPI en zona kill pesa en contra y uno en go a favor, pero tú integras el conjunto.',
  'Devuelve:',
  '- veredicto: go | pivote | kill.',
  '- confianza: 0 a 100, según la cantidad y consistencia de la evidencia.',
  '- justificacionPorKPI: por cada KPI relevante, una lectura breve de cómo influye.',
  '- recomendaciones: acciones concretas siguientes para el fundador.',
  '',
  'Puedes usar las tools (calcularKPIs, consultarHipotesis, consultarUmbrales) para',
  'contextualizar. No inventes datos: un KPI sin evidencia (sin_datos) baja tu confianza.',
].join('\n');

/**
 * Mensaje del usuario con el snapshot de KPIs a analizar. El owner/idea NO se
 * ponen aquí (el agente los recibe acotados vía las tools, nunca los provee él).
 */
export function humanVeredicto(tablero: TableroIdea): string {
  const kpis = tablero.kpis
    .map((k) => {
      const kill = k.umbralKill === null ? '—' : k.umbralKill;
      const valor = k.valor === null ? 'sin datos' : k.valor;
      return `  - ${k.kpi} [${k.grupo}]: valor=${valor}, zona=${k.zona} (go≥${k.umbralGo}, kill<${kill})`;
    })
    .join('\n');
  const r = tablero.resumen;
  return [
    'Emite el veredicto de esta idea a partir de su tablero de KPIs.',
    '',
    `Resumen del semáforo: ${r.enZonaGo} en go, ${r.enObservacion} en observación, ${r.enZonaKill} en kill, ${r.sinDatos} sin datos (de ${r.totalKpis}).`,
    '',
    'KPIs:',
    kpis,
  ].join('\n');
}
