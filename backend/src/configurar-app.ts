import cookieParser from 'cookie-parser';
import { INestApplication } from '@nestjs/common';

/**
 * Configuración de la aplicación compartida por el arranque real (`main.ts`) y
 * por la suite e2e.
 *
 * Existe precisamente para que **no haya dos definiciones** de qué es la
 * aplicación. Si los tests replicaran esta configuración por su cuenta, el día
 * que alguien añadiera aquí un middleware o un interceptor global el e2e
 * seguiría probando la aplicación anterior — y lo haría en verde, que es la peor
 * forma de fallar. Todo lo que deba valer por igual en producción y en pruebas
 * va aquí.
 *
 * Quedan deliberadamente FUERA:
 * - **CORS**: depende del entorno (`CORS_ORIGINS`) y no interviene en peticiones
 *   de servidor a servidor como las de la suite.
 * - **Swagger**: solo monta documentación y ralentizaría cada arranque de la
 *   suite sin verificar nada del comportamiento.
 */
export function configurarApp(app: INestApplication): void {
  // Parseo de cookies: necesario para leer la cookie `HttpOnly` del refresh
  // token en `/usuarios/refresh` y `/usuarios/logout`.
  app.use(cookieParser());
}
