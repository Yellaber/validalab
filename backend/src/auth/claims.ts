import { z } from 'zod';

/**
 * Rol del usuario para RBAC (terminología del contrato). El módulo `usuarios`
 * es el dueño funcional de este concepto; aquí se define lo mínimo para validar
 * y tipar los claims del token.
 */
export const rolSchema = z.enum(['validador', 'administrador']);
export type Rol = z.infer<typeof rolSchema>;

/**
 * Claims esperados en el `accessToken` ya verificado. `sub` es el `owner_id`
 * del usuario (uuid) y es la ÚNICA fuente válida del `owner_id` en todo el
 * backend; jamás se acepta del cliente.
 */
export const claimsSchema = z.object({
  sub: z.uuid(),
  rol: rolSchema,
});
export type Claims = z.infer<typeof claimsSchema>;

/** Identidad autenticada que el guard adjunta al request. */
export interface UsuarioAutenticado {
  ownerId: string;
  rol: Rol;
}
