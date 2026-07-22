import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { autorizacionInterceptor } from './core/auth/autorizacion.interceptor';
import { rehidratarSesion } from './core/auth/rehidratar-sesion';
import { errorInterceptor } from './core/http/error.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // Orden: `error` externo, `autorizacion` interno → la renovación ante 401 ve
    // el error crudo antes de que se traduzca a ErrorApi.
    provideHttpClient(withInterceptors([errorInterceptor, autorizacionInterceptor])),
    provideRouter(routes),
    // Rehidrata la sesión (silent refresh) antes de activar las rutas.
    provideAppInitializer(rehidratarSesion),
  ],
};
