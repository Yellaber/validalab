import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { CodigoError, DetalleError, ErrorApi } from '../api/error-api.model';

/** Códigos que el backend puede devolver en el sobre `Error` (sin el sintético `ERROR_RED`). */
const CODIGOS_BACKEND = new Set<CodigoError>([
  'VALIDACION_FALLIDA',
  'NO_AUTENTICADO',
  'ACCESO_DENEGADO',
  'RECURSO_NO_ENCONTRADO',
  'CONFLICTO',
  'ENTREVISTA_SIN_VINCULO',
  'API_KEY_INVALIDA',
  'SALIDA_AGENTE_INVALIDA',
  'PROVEEDOR_IA_NO_DISPONIBLE',
  'LIMITE_TASA',
  'ERROR_INTERNO',
]);

interface SobreError {
  codigo?: string;
  mensaje?: string;
  detalles?: DetalleError[];
}

/**
 * Traduce toda respuesta de error HTTP al `ErrorApi` tipado del contrato,
 * preservando `codigo`/`mensaje`/`detalles`. Un fallo de red/timeout (status 0,
 * sin sobre del backend) se normaliza a `ERROR_RED`. Un `ErrorApi` ya traducido
 * (p. ej. re-emitido por el interceptor de autorización) se deja pasar.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof ErrorApi) {
        return throwError(() => error);
      }
      if (error instanceof HttpErrorResponse) {
        return throwError(() => aErrorApi(error));
      }
      return throwError(() => new ErrorApi('ERROR_INTERNO', 'Ocurrió un error inesperado.'));
    }),
  );

function aErrorApi(error: HttpErrorResponse): ErrorApi {
  if (error.status === 0) {
    return new ErrorApi(
      'ERROR_RED',
      'No se pudo conectar con el servidor. Revisa tu conexión.',
      undefined,
      0,
    );
  }
  const sobre = (error.error ?? null) as SobreError | null;
  const codigo =
    sobre?.codigo && CODIGOS_BACKEND.has(sobre.codigo as CodigoError)
      ? (sobre.codigo as CodigoError)
      : 'ERROR_INTERNO';
  const mensaje = sobre?.mensaje ?? error.message ?? 'Ocurrió un error en el servidor.';
  return new ErrorApi(codigo, mensaje, sobre?.detalles, error.status);
}
