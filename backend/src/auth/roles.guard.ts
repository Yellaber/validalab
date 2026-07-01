import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AccesoDenegadoException,
  NoAutenticadoException,
} from '../common/errors/dominio.exception';
import { Rol, UsuarioAutenticado } from './claims';
import { ROLES_KEY } from './roles.decorator';

interface RequestConUsuario {
  usuario?: UsuarioAutenticado;
}

/**
 * Guard de RBAC global. Se ejecuta DESPUÉS del `JwtAuthGuard` (que ya adjuntó el
 * `UsuarioAutenticado` con su `rol`). Si el handler no declara `@Roles(...)`, deja
 * pasar; si los declara, exige que el rol del token esté entre los permitidos.
 * Rol insuficiente → `403 ACCESO_DENEGADO`, sin revelar el recurso.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const usuario = request.usuario;
    if (!usuario) {
      // No debería ocurrir tras el JwtAuthGuard, pero nunca autorizamos sin identidad.
      throw new NoAutenticadoException();
    }

    if (!rolesRequeridos.includes(usuario.rol)) {
      throw new AccesoDenegadoException(
        'Se requiere un rol con privilegios de administración.',
      );
    }
    return true;
  }
}
