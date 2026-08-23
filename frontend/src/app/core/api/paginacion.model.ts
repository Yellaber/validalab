/**
 * Sobres de paginación transversales del contrato (`contrato-api/openapi.yaml`).
 * `RespuestaPaginada<T>` es el envoltorio de toda colección; los endpoints
 * concretos estrechan `datos` al recurso correspondiente (aquí `Idea`, luego
 * contactos, entrevistas, …).
 */
export interface Paginacion {
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
}

export interface RespuestaPaginada<T> {
  datos: T[];
  paginacion: Paginacion;
}
