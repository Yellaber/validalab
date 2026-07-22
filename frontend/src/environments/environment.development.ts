/**
 * Entorno de desarrollo (activo en `ng serve` / build `development`). Apunta al
 * backend NestJS local. Como el frontend (4200) y el backend (3000) son orígenes
 * distintos, las peticiones van con `withCredentials` y el backend responde CORS
 * con credenciales para este origen.
 */
export const environment = {
  production: false,
  baseUrl: 'http://localhost:3000',
};
