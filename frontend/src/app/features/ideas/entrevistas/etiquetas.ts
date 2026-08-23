import { EstadoScoring } from '../../../core/api/entrevista.model';

/**
 * Etiquetas legibles del estado del scoring. Describen **qué ha pasado**, no qué
 * hacer: las acciones sobre el scoring son del change siguiente.
 */
export const ETIQUETA_ESTADO_SCORING: Record<EstadoScoring, string> = {
  pendiente: 'Pendiente de puntuar',
  procesando: 'Puntuando…',
  puntuada: 'Puntuada',
  fallida: 'No se pudo puntuar',
};
