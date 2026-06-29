import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioAutenticado } from './claims';

/**
 * Extrae el usuario autenticado que el `JwtAuthGuard` adjuntó al request. Se
 * exporta como función para poder probarla de forma aislada.
 */
export function obtenerUsuarioActual(
  _data: unknown,
  ctx: ExecutionContext,
): UsuarioAutenticado {
  const request = ctx
    .switchToHttp()
    .getRequest<{ usuario?: UsuarioAutenticado }>();
  return request.usuario as UsuarioAutenticado;
}

/** Inyecta el `UsuarioAutenticado` (ownerId + rol) en un parámetro del handler. */
export const UsuarioActual = createParamDecorator(obtenerUsuarioActual);

/**
 * Extrae el `owner_id` del usuario autenticado.
 *
 * CONVENCIÓN DE AISLAMIENTO MULTI-TENANT (regla de oro del backend):
 * - El `owner_id` SOLO proviene de aquí (derivado del token verificado), nunca
 *   del cuerpo, query o ruta de la petición.
 * - TODO repositorio de dominio DEBE filtrar cada consulta por este `owner_id`.
 * - Un recurso que existe pero pertenece a otro `owner_id` se trata como ajeno:
 *   se lanza `AccesoDenegadoException` (→ 403 `ACCESO_DENEGADO`), sin revelar
 *   sus datos.
 */
export function obtenerOwnerId(_data: unknown, ctx: ExecutionContext): string {
  return obtenerUsuarioActual(_data, ctx).ownerId;
}

/** Inyecta el `owner_id` (string uuid) del usuario autenticado. */
export const OwnerId = createParamDecorator(obtenerOwnerId);
