import { createHash } from 'node:crypto';
import { RespuestaEntrevista } from '../../entrevistas/entrevista/entrevista.types';

/**
 * Hash idempotente del scoring (RF-22c): identifica de forma estable la ENTRADA
 * que el agente puntúa. Se compone de las respuestas normalizadas (ordenadas por
 * `preguntaId` para no depender del orden de captura) y la versión de rúbrica
 * vigente. Si el hash coincide con el del `score` ya `puntuada`, no se re-puntúa;
 * cambiar una respuesta o subir la versión de rúbrica cambia el hash.
 */
export function calcularHashScoring(
  respuestas: RespuestaEntrevista[],
  versionRubrica: string,
): string {
  const normalizadas = [...respuestas]
    .map((r) => ({ preguntaId: r.preguntaId, texto: r.texto }))
    .sort((a, b) => a.preguntaId.localeCompare(b.preguntaId));
  const material = `${JSON.stringify(normalizadas)}|${versionRubrica}`;
  return createHash('sha256').update(material).digest('hex');
}
