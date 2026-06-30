import { Usuario } from './usuario.entity';
import { EstadoUsuario, Rol } from './usuario.types';

/** Recurso `Usuario` del contrato. NUNCA incluye contraseña ni hash. */
export interface UsuarioRespuesta {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  estado: EstadoUsuario;
  fechaCreacion: string;
}

/** Tokens de sesión emitidos en login y refresh (esquema `TokenRespuesta`). */
export interface TokenRespuesta {
  accessToken: string;
  refreshToken: string;
  tokenTipo: 'Bearer';
  expiraEn: number;
  usuario: UsuarioRespuesta;
}

/**
 * Mapea la entidad `Usuario` al recurso del contrato, excluyendo
 * explícitamente `passwordHash` (no se copia ningún campo de credencial).
 */
export function aUsuarioDto(usuario: Usuario): UsuarioRespuesta {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    estado: usuario.estado,
    fechaCreacion: usuario.fechaCreacion.toISOString(),
  };
}
