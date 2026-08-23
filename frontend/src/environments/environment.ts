/**
 * Entorno de producción (por defecto en `ng build`). `baseUrl` relativa: se
 * asume el backend tras el mismo origen/proxy inverso. La variante de desarrollo
 * (`environment.development.ts`) lo reemplaza vía `fileReplacements`.
 */
export const environment = {
  production: true,
  baseUrl: '/api',
};
