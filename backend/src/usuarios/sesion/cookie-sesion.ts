import { CookieOptions } from 'express';

/** Nombre de la cookie `HttpOnly` que transporta el refresh token opaco. */
export const NOMBRE_COOKIE_REFRESH = 'refreshToken';

/**
 * `Path` de la cookie de refresh: acota su envío a las rutas de sesión
 * (`/usuarios/refresh` y `/usuarios/logout` cuelgan de aquí), minimizando la
 * superficie por la que el navegador la adjunta.
 */
const PATH_COOKIE_REFRESH = '/usuarios';

/**
 * Opciones de la cookie de refresh. `HttpOnly` (invisible a JS, anti-XSS),
 * `SameSite=Strict` (mitiga CSRF: solo se envía en peticiones del mismo sitio),
 * `Secure` según entorno (`false` solo en dev http) y `Path` acotado. El
 * `maxAgeMs` iguala el TTL del refresh token para que la cookie caduque a la vez
 * que la sesión en BD.
 */
export function opcionesCookieRefresh({
  secure,
  maxAgeMs,
}: {
  secure: boolean;
  maxAgeMs: number;
}): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: PATH_COOKIE_REFRESH,
    maxAge: maxAgeMs,
  };
}

/**
 * Opciones para **limpiar** la cookie de refresh en logout. Deben coincidir en
 * `path`/`sameSite`/`secure`/`httpOnly` con las de emisión para que el navegador
 * la borre; sin `maxAge` (lo fija `clearCookie`).
 */
export function opcionesLimpiezaCookieRefresh({
  secure,
}: {
  secure: boolean;
}): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: PATH_COOKIE_REFRESH,
  };
}
