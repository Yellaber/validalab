/**
 * Entorno de producción (por defecto en `ng build`). `baseUrl` es el origen
 * ABSOLUTO del backend, no una ruta relativa: frontend y backend viven en
 * plataformas distintas (Vercel y Railway), así que no hay origen compartido ni
 * proxy inverso que resuelva una ruta relativa. Las peticiones van con
 * `withCredentials` y el backend responde CORS con credenciales para el origen
 * de Vercel.
 *
 * Un prefijo relativo como `/api` no solo apuntaría a Vercel, donde no hay
 * backend: chocaría además con el `Path=/usuarios` con el que se emite la cookie
 * de refresh, que el navegador solo adjunta a rutas bajo ese prefijo del origen
 * del backend.
 *
 * Sin barra final: las rutas se componen como `${baseUrl}/ideas`.
 *
 * La variante de desarrollo (`environment.development.ts`) lo reemplaza vía
 * `fileReplacements`.
 */
export const environment = {
  production: true,
  baseUrl: 'https://validalab-production.up.railway.app',
};
