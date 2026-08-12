/**
 * Recurso `Hipotesis` del contrato (`contrato-api/openapi.yaml`, tag `ideas`,
 * endpoints anidados bajo `/ideas/{id}/hipotesis`). Escrito a mano reflejando el
 * contrato (fuente de verdad). Cuelga de una idea: el `ideaId` viaja SIEMPRE en el
 * path y NUNCA en el cuerpo, igual que el `ownerId`, que lo deriva el backend del
 * token.
 */

/** Dimensión falsable que la hipótesis pone a prueba. */
export type TipoHipotesis =
  | 'problema' // el problema existe y duele
  | 'mercado' // hay un segmento alcanzable que lo padece
  | 'pago'; // hay disposición a pagar por resolverlo

/** Estado de aprendizaje de la hipótesis. Nace `pendiente`. */
export type EstadoHipotesis = 'pendiente' | 'confirmada' | 'refutada';

export interface Hipotesis {
  id: string;
  /** Idea a la que pertenece; derivado del path, nunca aceptado como entrada. */
  ideaId: string;
  tipo: TipoHipotesis;
  enunciado: string;
  estado: EstadoHipotesis;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * Cuerpo de `POST /ideas/{id}/hipotesis`. No incluye `ideaId` (lo da el path) ni
 * `estado` (la hipótesis nace `pendiente`).
 */
export interface CrearHipotesisRequest {
  tipo: TipoHipotesis;
  enunciado: string;
}

/**
 * Cuerpo de `PATCH /ideas/{id}/hipotesis/{idHipotesis}`: todos los campos son
 * opcionales. No incluye `ideaId`. El marcado de `estado` es una anotación manual
 * del usuario, no un dictamen del sistema.
 */
export interface ActualizarHipotesisRequest {
  tipo?: TipoHipotesis;
  enunciado?: string;
  estado?: EstadoHipotesis;
}
