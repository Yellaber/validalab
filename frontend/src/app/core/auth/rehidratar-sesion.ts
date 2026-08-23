import { inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { SesionService } from './sesion.service';

/**
 * Inicializador de arranque: intenta un silent refresh para rehidratar la sesión
 * desde la cookie `HttpOnly` **antes** de activar las rutas. Si hay cookie válida,
 * restaura access token + usuario; si responde `401` (sin cookie o expirada), se
 * traga el error y la app arranca sin sesión. Se registra con `provideAppInitializer`.
 */
export function rehidratarSesion() {
  const sesion = inject(SesionService);
  return sesion.renovar().pipe(catchError(() => of(null)));
}
