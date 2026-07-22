import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { SesionService } from './sesion.service';

/**
 * Exige sesión para las rutas protegidas. Al usar `CanMatch`, una ruta protegida
 * ni siquiera carga su chunk para un usuario sin sesión. La sesión ya está
 * resuelta cuando corre (el silent refresh de arranque se resuelve antes de
 * activar rutas), así que la lectura del signal es síncrona.
 */
export const sesionGuard: CanMatchFn = () => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  return sesion.estaAutenticado() ? true : router.parseUrl('/login');
};

/** Mantiene al usuario ya autenticado fuera de las rutas públicas (login/registro). */
export const invitadoGuard: CanMatchFn = () => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  return sesion.estaAutenticado() ? router.parseUrl('/') : true;
};
