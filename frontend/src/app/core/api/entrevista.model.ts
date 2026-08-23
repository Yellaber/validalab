/**
 * Recurso `Entrevista` del contrato (`contrato-api/openapi.yaml`, tag `entrevistas`,
 * rutas anidadas bajo la idea). Escrito a mano reflejando el contrato.
 *
 * Una entrevista es el punto donde convergen idea, contacto y guión: cuelga de la
 * idea (el `ideaId` va SIEMPRE en el path, nunca en el cuerpo), se vincula a un
 * contacto de esa misma idea (RNF-14) y captura una respuesta por cada pregunta del
 * guión usado.
 *
 * Dos efectos que el cliente refleja pero no provoca: registrar una entrevista mueve
 * el contacto a `entrevistado` y dispara el scoring; eliminarla lo devuelve a
 * `agendado`.
 */

/** Estado del scoring del agente sobre la entrevista. */
export const ESTADOS_SCORING = ['pendiente', 'procesando', 'puntuada', 'fallida'] as const;
export type EstadoScoring = (typeof ESTADOS_SCORING)[number];

/** Respuesta capturada a una pregunta del guión. */
export interface RespuestaEntrevista {
  preguntaId: string;
  texto: string;
}

/** Cita textual del entrevistado, como evidencia cualitativa (RF-10). */
export interface Cita {
  id: string;
  texto: string;
  contexto?: string;
}

/** Cita tal como se **envía**: sin `id`, que lo asigna el servidor. */
export interface CrearCitaRequest {
  texto: string;
  contexto?: string;
}

/**
 * Señales estructuradas que el agente clasifica al puntuar. Insumo de los KPIs de
 * señal de problema/pago (E5).
 *
 * Se declara para que el modelo sea fiel al contrato; **se lee en el change de
 * scoring y ajuste**, no en el de registro.
 */
export interface SenalesEstructuradas {
  dolorConfirmado: boolean;
  dolorUrgente: boolean;
  sinSolucionActual: boolean;
  disposicionPago: boolean;
}

/**
 * Resultado del scoring del agente. De solo lectura: lo produce el Validador
 * Inteligente, nunca el cliente.
 *
 * Se declara para que el modelo sea fiel al contrato; **se lee en el change de
 * scoring y ajuste**, no en el de registro.
 */
export interface ScoreEntrevista {
  score: number;
  justificacion: string;
  senales: string[];
  confianza: number;
  senalesEstructuradas?: SenalesEstructuradas;
  proveedor?: string;
  modelo?: string;
  rubricaVersion?: string;
  hashEntrada?: string;
  tokensEntrada?: number;
  tokensSalida?: number;
  costoEstimado?: number;
  moneda?: 'USD';
  fechaScoring?: string;
}

/**
 * Ajuste humano del score, conservado **junto** al del agente (RF-09c).
 *
 * Se declara para que el modelo sea fiel al contrato; **se lee en el change de
 * scoring y ajuste**, no en el de registro.
 */
export interface AjusteScore {
  scoreAjustado: number;
  nota: string;
  fechaAjuste: string;
}

export interface Entrevista {
  id: string;
  /** Idea a la que pertenece; derivado del path, nunca aceptado como entrada. */
  ideaId: string;
  contactoId: string;
  guionId: string;
  respuestas: RespuestaEntrevista[];
  citas: Cita[];
  estadoScoring: EstadoScoring;
  /** Resultado del agente; `null` mientras el scoring está `pendiente` o `fallida`. */
  score: ScoreEntrevista | null;
  /** Ajuste humano; `null` si el usuario no lo ha ajustado. */
  ajuste: AjusteScore | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * Alta de entrevista. No incluye `ideaId` (lo da el path) ni `score` (lo produce el
 * agente). `contactoId` debe ser un contacto de la misma idea; `guionId`, un guión
 * propio. Exige al menos una respuesta.
 */
export interface CrearEntrevistaRequest {
  contactoId: string;
  guionId: string;
  respuestas: RespuestaEntrevista[];
  citas?: CrearCitaRequest[];
}

/**
 * Ajuste humano del score. Conserva el del agente: el contrato devuelve la entrevista
 * con su bloque `score` intacto y el `ajuste` añadido. La `nota` es obligatoria — un
 * ajuste sin motivo es un número sin defensa.
 */
export interface AjustarScoreRequest {
  scoreAjustado: number;
  nota: string;
}

/**
 * Cambios sobre una entrevista. **No admite `contactoId` ni `guionId`**: una vez
 * registrada, la entrevista no cambia de persona ni de guión.
 *
 * Cambiar `respuestas` invalida el score previo y re-dispara el scoring; cambiar
 * solo `citas` no lo afecta.
 */
export interface ActualizarEntrevistaRequest {
  respuestas?: RespuestaEntrevista[];
  citas?: CrearCitaRequest[];
}
