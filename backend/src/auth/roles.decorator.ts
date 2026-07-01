import { SetMetadata } from '@nestjs/common';
import { Rol } from './claims';

/** Clave de metadatos con los roles permitidos para un handler/controlador. */
export const ROLES_KEY = 'roles_requeridos';

/**
 * Restringe una ruta a los roles indicados (RBAC). El `RolesGuard` global lee
 * estos metadatos y deniega con `403 ACCESO_DENEGADO` a quien no los tenga.
 * Sin este decorador, cualquier usuario autenticado pasa. Ej.: `@Roles('administrador')`.
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
