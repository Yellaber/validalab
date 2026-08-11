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
      { path: '', redirectTo: 'ideas', pathMatch: 'full' },
      {
        path: 'ideas',
        loadComponent: () => import('./features/ideas/lista/lista').then((m) => m.ListaIdeas),
      },
      {
        path: 'ideas/nueva',
        loadComponent: () =>
          import('./features/ideas/formulario/formulario').then((m) => m.FormularioIdea),
      },
      {
        path: 'ideas/:id',
        loadComponent: () => import('./features/ideas/detalle/detalle').then((m) => m.DetalleIdea),
      },
      {
        path: 'ideas/:id/editar',
        loadComponent: () =>
          import('./features/ideas/formulario/formulario').then((m) => m.FormularioIdea),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
