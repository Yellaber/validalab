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
 * Valores admitidos para el atributo `SameSite` de la cookie de refresh. Lo
 * decide el entorno (`COOKIE_SAMESITE`), no el código: `strict` mientras
 * frontend y backend compartan sitio registrable, `none` cuando no —y entonces
 * `Secure` es obligatorio, cosa que el esquema del entorno ya verifica—.
 */
export type SameSiteCookie = 'strict' | 'lax' | 'none';

/**
 * Opciones de la cookie de refresh. `HttpOnly` (invisible a JS, anti-XSS),
 * `Secure` y `SameSite` según entorno, y `Path` acotado. El `maxAgeMs` iguala el
 * TTL del refresh token para que la cookie caduque a la vez que la sesión en BD.
 *
 * `SameSite` es el único atributo que depende de la topología del despliegue:
 * con `strict` el navegador no envía la cookie desde otro sitio registrable, lo
 * que mitiga CSRF pero rompe una sesión repartida entre dos dominios.
 */
export function opcionesCookieRefresh({
  secure,
  sameSite,
  maxAgeMs,
}: {
  secure: boolean;
  sameSite: SameSiteCookie;
  maxAgeMs: number;
}): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: PATH_COOKIE_REFRESH,
    maxAge: maxAgeMs,
  };
}

/**
 * Opciones para **limpiar** la cookie de refresh en logout. Deben coincidir en
 * `path`/`sameSite`/`secure`/`httpOnly` con las de emisión para que el navegador
 * la borre; sin `maxAge` (lo fija `clearCookie`). Si `sameSite` no coincidiera
 * con el de emisión, la sesión quedaría revocada en BD pero la cookie muerta
 * seguiría en el navegador.
 */
export function opcionesLimpiezaCookieRefresh({
  secure,
  sameSite,
}: {
  secure: boolean;
  sameSite: SameSiteCookie;
}): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: PATH_COOKIE_REFRESH,
  };
}
