/**
 * Catálogo estable de códigos de error de ValidaLab (esquema `CodigoError` del
 * contrato) más `ERROR_RED`, código **sintético del cliente** para un fallo de
 * conectividad/timeout sin sobre del backend (distinto del `ERROR_INTERNO` 500
 * del servidor). La UI ramifica sobre `codigo`; el `mensaje` es informativo.
 */
export type CodigoError =
  | 'VALIDACION_FALLIDA'
  | 'NO_AUTENTICADO'
  | 'ACCESO_DENEGADO'
  | 'RECURSO_NO_ENCONTRADO'
  | 'CONFLICTO'
  | 'ENTREVISTA_SIN_VINCULO'
  | 'API_KEY_INVALIDA'
  | 'SALIDA_AGENTE_INVALIDA'
  | 'PROVEEDOR_IA_NO_DISPONIBLE'
  | 'LIMITE_TASA'
  | 'ERROR_INTERNO'
  | 'ERROR_RED';

/** Error de validación campo a campo (sobre `Error.detalles` del contrato). */
export interface DetalleError {
  campo: string;
  problema: string;
}

/**
 * Error tipado del cliente: envuelve el sobre `Error` del backend preservando el
 * `codigo` estable, el `mensaje` y los `detalles`. Lo produce el `errorInterceptor`
 * y lo consume la UI.
 */
export class ErrorApi extends Error {
  constructor(
    readonly codigo: CodigoError,
    mensaje: string,
    readonly detalles?: DetalleError[],
    readonly status?: number,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}
