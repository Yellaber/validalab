import { Usuario } from './usuario.model';

/**
 * Cuerpo de sesión emitido por `login` y `refresh` (esquema `TokenRespuesta`). NO
 * incluye `refreshToken`: ese viaja en la cookie `HttpOnly` que gestiona el
 * backend. El cliente usa `accessToken` en `Authorization: Bearer` y lo mantiene
 * en memoria.
 */
export interface TokenRespuesta {
  accessToken: string;
  tokenTipo: 'Bearer';
  expiraEn: number;
  usuario: Usuario;
}

/** Cuerpo de `POST /usuarios/registro`. */
export interface RegistroUsuarioRequest {
  email: string;
  nombre: string;
  password: string;
}

/** Cuerpo de `POST /usuarios/login`. */
export interface LoginRequest {
  email: string;
  password: string;
}
