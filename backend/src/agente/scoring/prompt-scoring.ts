import { Entrevista } from '../../entrevistas/entrevista/entrevista.entity';

/**
 * Instrucciones de sistema para el scoring de una entrevista (la "rúbrica"). El
 * agente evalúa la CALIDAD de la señal de descubrimiento: evidencia de dolor
 * real, disposición a pagar y ajuste con las hipótesis de la idea. Puede apoyarse
 * en las tools de dominio (`consultarHipotesis`, `consultarUmbrales`,
 * `consultarEntrevistas`) antes de puntuar. Debe devolver SOLO la salida
 * estructurada pedida; nada de texto libre fuera del esquema.
 */
export const SYSTEM_SCORING = [
  'Eres el Validador Inteligente de ValidaLab. Puntúas entrevistas de descubrimiento',
  'de clientes para ayudar a un fundador a decidir si una idea de software merece',
  'construirse. Eres riguroso y escéptico: distingues señales reales (dolor concreto,',
  'intentos previos de resolverlo, disposición a pagar) del entusiasmo de cortesía.',
  '',
  'Evalúa la entrevista y asigna:',
  '- score: 0 a 10, la fuerza de la señal de validación de esta entrevista.',
  '- justificacion: por qué ese score, citando lo observado en las respuestas.',
  '- senales: lista de señales concretas detectadas (positivas o negativas).',
  '- confianza: 0 a 100, cuánta certeza tienes en tu propio score.',
  '- senalesEstructuradas: cuatro banderas booleanas, según la evidencia de las respuestas:',
  '    · dolorConfirmado: el entrevistado confirma que el problema existe y le afecta.',
  '    · dolorUrgente: lo describe como urgente o prioritario, no un "estaría bien".',
  '    · sinSolucionActual: hoy no usa una solución que le sirva (dolor sin resolver).',
  '    · disposicionPago: muestra interés explícito en pagar por una solución.',
  '  Marca cada bandera solo si hay evidencia clara; ante la duda, ponla en false.',
  '',
  'Puedes usar las tools disponibles para consultar las hipótesis, los umbrales y',
  'otras entrevistas de la idea si te ayuda a contextualizar. No inventes datos: si',
  'una respuesta es ambigua, refléjalo en una confianza más baja.',
].join('\n');

/**
 * Mensaje del usuario con los datos de la entrevista a puntuar. Incluye las
 * respuestas y las citas textuales; el owner/idea NO se ponen aquí (el agente los
 * recibe acotados vía las tools, nunca los provee él).
 */
export function humanScoring(entrevista: Entrevista): string {
  const respuestas = entrevista.respuestas
    .map((r, i) => `  ${i + 1}. [pregunta ${r.preguntaId}] ${r.texto}`)
    .join('\n');
  const citas =
    entrevista.citas.length > 0
      ? entrevista.citas.map((c) => `  - "${c.texto}"`).join('\n')
      : '  (sin citas)';
  return [
    'Puntúa esta entrevista de descubrimiento.',
    '',
    'Respuestas capturadas:',
    respuestas,
    '',
    'Citas textuales del entrevistado:',
    citas,
  ].join('\n');
}
