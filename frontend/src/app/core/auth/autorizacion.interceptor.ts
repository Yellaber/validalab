import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { SesionService } from './sesion.service';

/** Endpoints públicos: no llevan `Authorization` (registro y login). */
const PUBLICOS = /\/usuarios\/(registro|login)$/;
/** El propio refresh no debe re-disparar refresh ante su 401 (evita bucle). */
const REFRESH = /\/usuarios\/refresh$/;

/**
 * Fija `withCredentials` en toda petición (para que la cookie `HttpOnly` de
 * refresh viaje) y adjunta `Authorization: Bearer <accessToken>` cuando hay
 * sesión y el endpoint no es público. Ante un `401` en una petición autenticada,
 * dispara una única renovación (compartida) y reintenta con el token nuevo; si la
 * renovación falla, cierra la sesión y propaga el error.
 */
export const autorizacionInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  const esPublico = PUBLICOS.test(req.url);

  let peticion = req.clone({ withCredentials: true });
  const token = sesion.accessToken();
  if (token && !esPublico) {
    peticion = peticion.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(peticion).pipe(
    catchError((error: unknown) => {
      const es401 = error instanceof HttpErrorResponse && error.status === 401;
      const renovable = es401 && !esPublico && !REFRESH.test(req.url) && sesion.estaAutenticado();

      if (!renovable) {
        return throwError(() => error);
      }

      return sesion.renovar().pipe(
        switchMap((respuesta) =>
          next(
            peticion.clone({
              setHeaders: { Authorization: `Bearer ${respuesta.accessToken}` },
            }),
          ),
        ),
        catchError((errorRefresco: unknown) => {
          sesion.limpiar();
          return throwError(() => errorRefresco);
        }),
      );
    }),
  );
};
