/**
 * Catálogo estable de códigos de error de ValidaLab. Refleja el enum
 * `CodigoError` del contrato (`../contrato-api/openapi.yaml`). El cliente puede
 * ramificar su lógica sobre estos valores; el `mensaje` es informativo.
 */
export enum CodigoError {
  VALIDACION_FALLIDA = 'VALIDACION_FALLIDA',
  NO_AUTENTICADO = 'NO_AUTENTICADO',
  ACCESO_DENEGADO = 'ACCESO_DENEGADO',
  RECURSO_NO_ENCONTRADO = 'RECURSO_NO_ENCONTRADO',
  CONFLICTO = 'CONFLICTO',
  ENTREVISTA_SIN_VINCULO = 'ENTREVISTA_SIN_VINCULO',
  API_KEY_INVALIDA = 'API_KEY_INVALIDA',
  SALIDA_AGENTE_INVALIDA = 'SALIDA_AGENTE_INVALIDA',
  PROVEEDOR_IA_NO_DISPONIBLE = 'PROVEEDOR_IA_NO_DISPONIBLE',
  LIMITE_TASA = 'LIMITE_TASA',
  ERROR_INTERNO = 'ERROR_INTERNO',
}

/** Error de validación campo a campo, dentro de `detalles`. */
export interface DetalleError {
  campo: string;
  problema: string;
}

/** Sobre estándar de error de toda la API (esquema `Error` del contrato). */
export interface SobreError {
  codigo: CodigoError;
  mensaje: string;
  detalles?: DetalleError[];
}

/**
 * Estado HTTP canónico de cada código, según el contrato. El filtro global lo
 * usa para responder con el par (código, estado) correcto.
 */
export const ESTADO_HTTP_POR_CODIGO: Record<CodigoError, number> = {
  [CodigoError.VALIDACION_FALLIDA]: 400,
  [CodigoError.NO_AUTENTICADO]: 401,
  [CodigoError.ACCESO_DENEGADO]: 403,
  [CodigoError.RECURSO_NO_ENCONTRADO]: 404,
  [CodigoError.CONFLICTO]: 409,
  [CodigoError.ENTREVISTA_SIN_VINCULO]: 422,
  [CodigoError.API_KEY_INVALIDA]: 422,
  [CodigoError.SALIDA_AGENTE_INVALIDA]: 502,
  [CodigoError.PROVEEDOR_IA_NO_DISPONIBLE]: 503,
  [CodigoError.LIMITE_TASA]: 429,
  [CodigoError.ERROR_INTERNO]: 500,
};

/**
 * Mapeo best-effort de un estado HTTP (p. ej. lanzado por un guard o una
 * `HttpException` de Nest) al código del catálogo. Lo que no se reconozca se
 * trata como `ERROR_INTERNO`.
 */
export const CODIGO_POR_ESTADO_HTTP: Record<number, CodigoError> = {
  400: CodigoError.VALIDACION_FALLIDA,
  401: CodigoError.NO_AUTENTICADO,
  403: CodigoError.ACCESO_DENEGADO,
  404: CodigoError.RECURSO_NO_ENCONTRADO,
  409: CodigoError.CONFLICTO,
  422: CodigoError.VALIDACION_FALLIDA,
  429: CodigoError.LIMITE_TASA,
  503: CodigoError.PROVEEDOR_IA_NO_DISPONIBLE,
};
