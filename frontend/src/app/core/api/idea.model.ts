/**
 * Recurso `Idea` del contrato (`contrato-api/openapi.yaml`, tag `ideas`). Escrito a
 * mano reflejando el contrato (fuente de verdad). Entidad raíz del dominio, aislada
 * por usuario: el `ownerId` lo deriva el backend del token y NUNCA se envía en los
 * requests.
 */
export type EstadoIdea =
  | 'borrador' // recién creada; aún sin trabajo de validación
  | 'en_validacion' // con descubrimiento en curso (se origina con entrevistas, E4)
  | 'go' // veredicto aprobado: continuar (E6)
  | 'pivote' // veredicto aprobado: pivotar (E6)
  | 'kill' // veredicto aprobado: descartar (E6)
  | 'archivada'; // retirada del tablero activo, conservando su evidencia

export interface Idea {
  id: string;
  ownerId: string;
  titulo: string;
  descripcion?: string;
  problema: string;
  segmentoBeachhead?: string;
  estado: EstadoIdea;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/** Cuerpo de `POST /ideas`. `titulo` y `problema` son obligatorios. Sin `ownerId`. */
export interface CrearIdeaRequest {
  titulo: string;
  problema: string;
  descripcion?: string;
  segmentoBeachhead?: string;
}

/**
 * Cuerpo de `PATCH /ideas/{id}`: cambios de contenido. NO incluye `estado`
 * (las transiciones `go`/`pivote`/`kill` provienen del veredicto aprobado, E6)
 * ni `ownerId`.
 */
export interface ActualizarIdeaRequest {
  titulo?: string;
  problema?: string;
  descripcion?: string;
  segmentoBeachhead?: string;
}
