/**
 * Recurso `Usuario` del contrato (`contrato-api/openapi.yaml`). Escrito a mano
 * reflejando el contrato (fuente de verdad); NUNCA incluye contraseña ni hash.
 */
export type Rol = 'validador' | 'administrador';
export type EstadoUsuario = 'activo' | 'suspendido';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  estado: EstadoUsuario;
  fechaCreacion: string;
}
