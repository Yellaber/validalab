import { z } from 'zod';

// El rol se reutiliza de la fundación (claims del JWT) para no duplicarlo.
export { rolSchema, type Rol } from '../auth/claims';

/** Estado de la cuenta. Una cuenta `suspendido` no puede autenticarse. */
export const estadoUsuarioSchema = z.enum(['activo', 'suspendido']);
export type EstadoUsuario = z.infer<typeof estadoUsuarioSchema>;
