/** Metadatos de paginación que acompañan a toda colección (esquema `Paginacion`). */
export interface Paginacion {
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
}

/** Sobre de respuesta para colecciones (esquema `RespuestaPaginada` del contrato). */
export interface RespuestaPaginada<T> {
  datos: T[];
  paginacion: Paginacion;
}

/**
 * Construye el sobre `RespuestaPaginada` a partir de la página de datos, el
 * total disponible y los parámetros solicitados. Centraliza el cálculo de
 * `totalPaginas` para que ningún módulo lo reimplemente.
 */
export function crearRespuestaPaginada<T>(
  datos: T[],
  total: number,
  query: { pagina: number; porPagina: number },
): RespuestaPaginada<T> {
  const totalPaginas =
    query.porPagina > 0 ? Math.ceil(total / query.porPagina) : 0;

  return {
    datos,
    paginacion: {
      pagina: query.pagina,
      porPagina: query.porPagina,
      total,
      totalPaginas,
    },
  };
}
