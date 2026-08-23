import { EstadoVeredicto, TipoVeredicto } from '../../../core/api/veredicto.model';

/** Etiqueta legible del juicio del agente. */
export const ETIQUETA_TIPO_VEREDICTO: Record<TipoVeredicto, string> = {
  go: 'Continuar (go)',
  pivote: 'Pivotar',
  kill: 'Descartar (kill)',
};

/**
 * Etiqueta legible del estado de verificación humana. Describe **en qué punto del
 * gobierno consultivo** está el veredicto, no una acción.
 */
export const ETIQUETA_ESTADO_VEREDICTO: Record<EstadoVeredicto, string> = {
  pendiente: 'Pendiente de verificar',
  aprobado: 'Aprobado',
  anulado: 'Anulado',
};
