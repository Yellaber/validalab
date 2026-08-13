import {
  CANALES_CONTACTO,
  CanalContacto,
  Contacto,
  ESTADOS_OUTREACH,
  EstadoOutreach,
  ORIGENES_CONTACTO,
  OrigenContacto,
} from '../../../core/api/contacto.model';

/**
 * Reglas y etiquetas del embudo de outreach.
 *
 * Distinción deliberada entre dos catálogos que comparten tipo:
 * - `ESTADOS_FILTRO` — los **seis** estados, para filtrar el listado. Incluye
 *   `entrevistado` porque un contacto sí puede estar ahí (lo pone E4).
 * - `destinosAlcanzables` — los destinos de una **transición manual**. Nunca incluye
 *   `entrevistado`, que solo origina el registro de una entrevista.
 */

/** Estados ofrecidos en el filtro del listado, en orden del embudo. */
export const ESTADOS_FILTRO: readonly EstadoOutreach[] = ESTADOS_OUTREACH;

/** Avance natural del embudo; `entrevistado` queda fuera a propósito. */
const SIGUIENTE: Partial<Record<EstadoOutreach, EstadoOutreach>> = {
  por_contactar: 'contactado',
  contactado: 'respondio',
  respondio: 'agendado',
};

/** Estados desde los que ya no se puede mover el contacto. */
const TERMINALES: readonly EstadoOutreach[] = ['entrevistado', 'descartado'];

/**
 * Destinos alcanzables por transición manual desde `estado`: el siguiente del embudo
 * (si lo hay) más `descartado`, alcanzable desde cualquier estado no terminal.
 *
 * Es una tabla local: el contrato describe el embudo en prosa y no lo expone de forma
 * consultable. Solo decide **qué acciones se ofrecen**; la autoridad sigue siendo el
 * backend, y su `409 CONFLICTO` se maneja igual.
 */
export function destinosAlcanzables(estado: EstadoOutreach): EstadoOutreach[] {
  if (TERMINALES.includes(estado)) {
    return [];
  }
  const siguiente = SIGUIENTE[estado];
  return siguiente ? [siguiente, 'descartado'] : ['descartado'];
}

/** Número de toques registrados, derivado de las dos fechas del contrato. */
export function toquesDe(contacto: Contacto): number {
  return (contacto.primerToqueEn ? 1 : 0) + (contacto.segundoToqueEn ? 1 : 0);
}

/** Si el contacto agotó el límite de dos toques del método. */
export function alcanzoLimiteDeToques(contacto: Contacto): boolean {
  return toquesDe(contacto) >= 2;
}

export const ETIQUETA_ESTADO_OUTREACH: Record<EstadoOutreach, string> = {
  por_contactar: 'Por contactar',
  contactado: 'Contactado',
  respondio: 'Respondió',
  agendado: 'Agendado',
  entrevistado: 'Entrevistado',
  descartado: 'Descartado',
};

/** Verbo de la acción de transición, en imperativo. */
export const ACCION_TRANSICION: Record<EstadoOutreach, string> = {
  por_contactar: 'Devolver a por contactar',
  contactado: 'Marcar contactado',
  respondio: 'Marcar que respondió',
  agendado: 'Marcar agendado',
  entrevistado: 'Marcar entrevistado',
  descartado: 'Descartar',
};

export const ETIQUETA_CANAL: Record<CanalContacto, string> = {
  linkedin: 'LinkedIn',
  correo: 'Correo',
  mensajeria: 'Mensajería',
  otro: 'Otro',
};

export const ETIQUETA_ORIGEN: Record<OrigenContacto, string> = {
  busqueda_directa: 'Búsqueda directa',
  referido: 'Referido',
  comunidad: 'Comunidad',
  evento: 'Evento',
  otro: 'Otro',
};

export const CANALES = CANALES_CONTACTO;
export const ORIGENES = ORIGENES_CONTACTO;

/** Etiqueta de un estado, degradando a la clave cruda si no está catalogado. */
export function etiquetaEstado(estado: string): string {
  return ETIQUETA_ESTADO_OUTREACH[estado as EstadoOutreach] ?? estado;
}

/** Etiqueta de un canal, degradando a la clave cruda si no está catalogado. */
export function etiquetaCanal(canal: string): string {
  return ETIQUETA_CANAL[canal as CanalContacto] ?? canal;
}

/** Etiqueta de un origen, degradando a la clave cruda si no está catalogado. */
export function etiquetaOrigen(origen: string): string {
  return ETIQUETA_ORIGEN[origen as OrigenContacto] ?? origen;
}
