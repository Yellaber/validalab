import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { NoAutenticadoException } from '../../common/errors/dominio.exception';
import { claimsSchema, UsuarioAutenticado } from '../claims';
import { PUBLICO_KEY } from '../decorators/publico.decorator';

interface RequestConUsuario {
  headers?: Record<string, unknown>;
  usuario?: UsuarioAutenticado;
}

/**
 * Guard de autenticación global. Por defecto exige un `accessToken` JWT válido
 * en `Authorization: Bearer <token>`; las rutas marcadas con `@Publico()` se
 * dejan pasar. Verifica firma/expiración, valida los claims con Zod y adjunta
 * el `UsuarioAutenticado` (ownerId + rol) al request.
 *
 * Solo VERIFICA tokens: la emisión (login/registro/refresh) vive en `usuarios`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const esPublico = this.reflector.getAllAndOverride<boolean>(PUBLICO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublico) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const token = this.extraerToken(request);
    if (!token) {
      throw new NoAutenticadoException();
    }

    let payload: unknown;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new NoAutenticadoException('Token inválido o expirado.');
    }

    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) {
      throw new NoAutenticadoException('Token con claims inválidos.');
    }

    // El owner_id se deriva SIEMPRE del token; cualquier owner_id del cliente se
    // ignora por completo.
    request.usuario = { ownerId: claims.data.sub, rol: claims.data.rol };
    return true;
  }

  private extraerToken(request: RequestConUsuario): string | undefined {
    const cabecera = request.headers?.authorization;
    if (typeof cabecera !== 'string') {
      return undefined;
    }
    const [tipo, valor] = cabecera.split(' ');
    return tipo === 'Bearer' && valor ? valor : undefined;
  }
}
