import { Routes } from '@angular/router';
import { invitadoGuard, sesionGuard } from './core/auth/sesion.guard';

/**
 * Rutas públicas (login/registro, con `invitadoGuard`) y protegidas (shell + hijos,
 * con `sesionGuard`), todas con carga diferida. `CanMatch` evita cargar el chunk de
 * una ruta protegida sin sesión; el guard redirige devolviendo un `UrlTree`.
 */
export const routes: Routes = [
  {
    path: 'login',
    canMatch: [invitadoGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    canMatch: [invitadoGuard],
    loadComponent: () => import('./features/auth/registro/registro').then((m) => m.Registro),
  },
  {
    path: '',
    canMatch: [sesionGuard],
    loadComponent: () => import('./features/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/shell/inicio/inicio').then((m) => m.Inicio),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
