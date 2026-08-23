/**
 * Recurso `Contacto` del contrato (`contrato-api/openapi.yaml`, tag `contactos`).
 * Escrito a mano reflejando el contrato (fuente de verdad).
 *
 * Un contacto es **información personal** y cuelga de una idea: el `ideaId` viaja
 * SIEMPRE en el path y nunca en el cuerpo, igual que el `ownerId`, que el backend
 * deriva del token.
 *
 * Los catálogos se declaran como arreglos `const` —para iterarlos con orden estable
 * en filtros y selects— y sus tipos se derivan del arreglo, de modo que arreglo y
 * unión no puedan divergir.
 */

/**
 * Posición del contacto en el embudo de outreach, en orden:
 * `por_contactar → contactado → respondio → agendado → entrevistado → descartado`.
 * `descartado` es alcanzable desde cualquier estado no terminal. `entrevistado` solo
 * lo asigna el registro de una entrevista (E4), nunca la transición manual.
 */
export const ESTADOS_OUTREACH = [
  'por_contactar',
  'contactado',
  'respondio',
  'agendado',
  'entrevistado',
  'descartado',
] as const;
export type EstadoOutreach = (typeof ESTADOS_OUTREACH)[number];

/** Canal por el que se contacta a la persona (outreach, típicamente en frío). */
export const CANALES_CONTACTO = ['linkedin', 'correo', 'mensajeria', 'otro'] as const;
export type CanalContacto = (typeof CANALES_CONTACTO)[number];

/** De dónde proviene el contacto. `referido` se acompaña de `referidoPorId`. */
export const ORIGENES_CONTACTO = [
  'busqueda_directa',
  'referido',
  'comunidad',
  'evento',
  'otro',
] as const;
export type OrigenContacto = (typeof ORIGENES_CONTACTO)[number];

export interface Contacto {
  id: string;
  /** Idea a la que pertenece; derivado del path, nunca aceptado como entrada. */
  ideaId: string;
  nombre: string;
  perfil?: string;
  enlace?: string;
  canal: CanalContacto;
  origen: OrigenContacto;
  /** Contacto de la misma idea que refirió a esta persona; `null` si no es referido. */
  referidoPorId?: string | null;
  /** Posición en el embudo; se mueve con la acción de transición, no editando contenido. */
  estado: EstadoOutreach;
  /** Fecha del primer toque; `null` si aún no se ha contactado. */
  primerToqueEn?: string | null;
  /** Fecha del segundo toque (único follow-up); `null` si no se ha hecho. */
  segundoToqueEn?: string | null;
  notas?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * Cuerpo de `POST /ideas/{id}/contactos`. Solo `nombre` es obligatorio. No incluye
 * `ideaId`, ni `estado` (nace `por_contactar`), ni fechas de toque.
 */
export interface CrearContactoRequest {
  nombre: string;
  perfil?: string;
  enlace?: string;
  canal?: CanalContacto;
  origen?: OrigenContacto;
  referidoPorId?: string | null;
}

/**
 * Cuerpo de `PATCH /ideas/{id}/contactos/{idContacto}`: contenido, todo opcional.
 * No incluye `ideaId`, ni `estado` (tiene su propia acción), ni fechas de toque.
 */
export interface ActualizarContactoRequest {
  nombre?: string;
  perfil?: string;
  enlace?: string;
  canal?: CanalContacto;
  origen?: OrigenContacto;
  referidoPorId?: string | null;
  notas?: string;
}

/** Cuerpo de `POST .../estado`. Una transición no permitida responde `409`. */
export interface TransicionEstadoRequest {
  estado: EstadoOutreach;
}

/**
 * Cuerpo de `POST .../toques`. La `fecha` es opcional: omitirla deja que el momento
 * lo fije el servidor. Máximo dos toques por contacto; el tercero responde `409`.
 */
export interface RegistrarToqueRequest {
  fecha?: string;
}
