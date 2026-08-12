import { EstadoHipotesis, TipoHipotesis } from '../../../core/api/hipotesis.model';

/** Tipos ofrecidos en el formulario, en el orden del embudo de validación. */
export const TIPOS_HIPOTESIS: TipoHipotesis[] = ['problema', 'mercado', 'pago'];

/** Estados a los que el usuario puede mover una hipótesis. */
export const ESTADOS_HIPOTESIS: EstadoHipotesis[] = ['pendiente', 'confirmada', 'refutada'];

/** Etiqueta legible de cada `TipoHipotesis` (terminología del SRS, en español). */
export const ETIQUETA_TIPO: Record<TipoHipotesis, string> = {
  problema: 'Problema',
  mercado: 'Mercado',
  pago: 'Pago',
};

/** Qué afirma cada tipo de hipótesis, para orientar al usuario al redactarla. */
export const AYUDA_TIPO: Record<TipoHipotesis, string> = {
  problema: 'El problema existe y duele',
  mercado: 'Hay un segmento alcanzable que lo padece',
  pago: 'Hay disposición a pagar por resolverlo',
};

/** Etiqueta legible de cada `EstadoHipotesis`. */
export const ETIQUETA_ESTADO_HIPOTESIS: Record<EstadoHipotesis, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  refutada: 'Refutada',
};

/** Verbo de la acción de marcado, redactado como anotación del usuario. */
export const ACCION_ESTADO: Record<EstadoHipotesis, string> = {
  pendiente: 'Volver a pendiente',
  confirmada: 'Marcar confirmada',
  refutada: 'Marcar refutada',
};

/** Etiqueta de un tipo, degradando a la clave cruda si no está catalogado. */
export function etiquetaTipo(tipo: string): string {
  return ETIQUETA_TIPO[tipo as TipoHipotesis] ?? tipo;
}

/** Etiqueta de un estado, degradando a la clave cruda si no está catalogado. */
export function etiquetaEstadoHipotesis(estado: string): string {
  return ETIQUETA_ESTADO_HIPOTESIS[estado as EstadoHipotesis] ?? estado;
}
