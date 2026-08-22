/**
 * Recurso `Guion` del contrato (`contrato-api/openapi.yaml`, tag `entrevistas`,
 * rutas `/guiones`). Escrito a mano reflejando el contrato (fuente de verdad).
 *
 * A diferencia de hipótesis, umbrales o contactos, un guión **no cuelga de una idea**:
 * es propiedad del usuario y reutilizable **entre ideas** (RF-08, HU-11). Por eso su
 * ruta es de primer nivel y no lleva `ideaId` en ninguna parte.
 *
 * El `ownerId` lo deriva el backend del token: aparece en la respuesta pero en
 * ningún request.
 */

/** Pregunta ordenada de un guión, tal como la devuelve el servidor. */
export interface Pregunta {
  id: string;
  /** Posición dentro del guión, base 1. */
  orden: number;
  texto: string;
}

/**
 * Pregunta tal como se **envía**. Nótese que no lleva `id`: al escribir, la identidad
 * de una pregunta es su posición, no su identificador.
 */
export interface PreguntaRequest {
  orden: number;
  texto: string;
}

export interface Guion {
  id: string;
  /** Propietario; derivado del token, nunca aceptado como entrada. */
  ownerId: string;
  nombre: string;
  descripcion?: string;
  /** Preguntas del guión en orden. */
  preguntas: Pregunta[];
  fechaCreacion: string;
  fechaActualizacion: string;
}

/** Alta de guión. No incluye `ownerId`. `preguntas` exige al menos una entrada. */
export interface CrearGuionRequest {
  nombre: string;
  descripcion?: string;
  preguntas: PreguntaRequest[];
}

/**
 * Cambios sobre un guión, todos opcionales. No incluye `ownerId`.
 *
 * `preguntas` **reemplaza el conjunto ordenado completo**: enviar un subconjunto
 * borraría el resto, así que el cliente manda siempre todas las preguntas.
 */
export interface ActualizarGuionRequest {
  nombre?: string;
  descripcion?: string;
  preguntas?: PreguntaRequest[];
}
