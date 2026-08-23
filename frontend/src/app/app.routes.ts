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
      {
        path: 'ideas/:id/hipotesis',
        loadComponent: () =>
          import('./features/ideas/hipotesis/hipotesis').then((m) => m.HipotesisIdea),
      },
      {
        path: 'ideas/:id/umbrales',
        loadComponent: () =>
          import('./features/ideas/umbrales/umbrales').then((m) => m.UmbralesIdea),
      },
      {
        path: 'ideas/:id/contactos',
        loadComponent: () =>
          import('./features/ideas/contactos/lista/lista').then((m) => m.ListaContactos),
      },
      {
        path: 'ideas/:id/contactos/nuevo',
        loadComponent: () =>
          import('./features/ideas/contactos/formulario/formulario').then(
            (m) => m.FormularioContacto,
          ),
      },
      {
        path: 'ideas/:id/contactos/:idContacto',
        loadComponent: () =>
          import('./features/ideas/contactos/detalle/detalle').then((m) => m.DetalleContacto),
      },
      {
        path: 'ideas/:id/contactos/:idContacto/editar',
        loadComponent: () =>
          import('./features/ideas/contactos/formulario/formulario').then(
            (m) => m.FormularioContacto,
          ),
      },
      // Entrevistas: `nueva` va antes que `:idEntrevista` para que no se resuelva
      // como un identificador.
      {
        path: 'ideas/:id/entrevistas',
        loadComponent: () =>
          import('./features/ideas/entrevistas/lista/lista').then((m) => m.ListaEntrevistas),
      },
      {
        path: 'ideas/:id/entrevistas/nueva',
        loadComponent: () =>
          import('./features/ideas/entrevistas/alta/alta').then((m) => m.AltaEntrevista),
      },
      {
        path: 'ideas/:id/entrevistas/:idEntrevista',
        loadComponent: () =>
          import('./features/ideas/entrevistas/detalle/detalle').then((m) => m.DetalleEntrevista),
      },
      {
        path: 'ideas/:id/entrevistas/:idEntrevista/editar',
        loadComponent: () =>
          import('./features/ideas/entrevistas/edicion/edicion').then((m) => m.EdicionEntrevista),
      },
      {
        path: 'ideas/:id/tablero',
        loadComponent: () =>
          import('./features/ideas/tablero/tablero/tablero').then((m) => m.TableroKpis),
      },
      {
        path: 'ideas/:id/alertas',
        loadComponent: () =>
          import('./features/ideas/tablero/alertas/alertas').then((m) => m.AlertasKpi),
      },
      // Guiones: dominio de primer nivel, no cuelga de ninguna idea. `nuevo` va antes
      // que `:idGuion` para que no se resuelva como un identificador.
      {
        path: 'guiones',
        loadComponent: () => import('./features/guiones/lista/lista').then((m) => m.ListaGuiones),
      },
      {
        path: 'guiones/nuevo',
        loadComponent: () =>
          import('./features/guiones/formulario/formulario').then((m) => m.FormularioGuion),
      },
      {
        path: 'guiones/:idGuion',
        loadComponent: () =>
          import('./features/guiones/detalle/detalle').then((m) => m.DetalleGuion),
      },
      {
        path: 'guiones/:idGuion/editar',
        loadComponent: () =>
          import('./features/guiones/formulario/formulario').then((m) => m.FormularioGuion),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
