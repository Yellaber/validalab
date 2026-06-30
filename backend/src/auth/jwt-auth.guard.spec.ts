import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { CodigoError } from '../common/errors/codigo-error';
import { NoAutenticadoException } from '../common/errors/dominio.exception';
import { UsuarioAutenticado } from './claims';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  obtenerOwnerId,
  obtenerUsuarioActual,
} from './usuario-actual.decorator';

const OWNER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

interface OpcionesContexto {
  authorization?: string;
  body?: Record<string, unknown>;
  usuario?: UsuarioAutenticado;
}

function crearContexto(opts: OpcionesContexto = {}): {
  context: ExecutionContext;
  request: {
    headers: Record<string, unknown>;
    body?: unknown;
    usuario?: UsuarioAutenticado;
  };
} {
  const request = {
    headers: opts.authorization ? { authorization: opts.authorization } : {},
    body: opts.body,
    usuario: opts.usuario,
  };
  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function crearGuard(verify: jest.Mock, esPublico = false): JwtAuthGuard {
  const jwt = { verify } as unknown as JwtService;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(esPublico),
  } as unknown as Reflector;
  return new JwtAuthGuard(jwt, reflector);
}

describe('JwtAuthGuard', () => {
  it('rechaza una ruta protegida sin token (NO_AUTENTICADO)', () => {
    const verify = jest.fn();
    const guard = crearGuard(verify);
    const { context } = crearContexto();

    expect(() => guard.canActivate(context)).toThrow(NoAutenticadoException);
    expect(verify).not.toHaveBeenCalled();
    try {
      guard.canActivate(context);
    } catch (e) {
      expect((e as NoAutenticadoException).codigo).toBe(
        CodigoError.NO_AUTENTICADO,
      );
    }
  });

  it('rechaza un token inválido o expirado (NO_AUTENTICADO)', () => {
    const verify = jest.fn(() => {
      throw new Error('jwt expired');
    });
    const guard = crearGuard(verify);
    const { context } = crearContexto({ authorization: 'Bearer token-malo' });

    expect(() => guard.canActivate(context)).toThrow(NoAutenticadoException);
  });

  it('deja pasar una ruta pública sin token', () => {
    const verify = jest.fn();
    const guard = crearGuard(verify, true);
    const { context } = crearContexto();

    expect(guard.canActivate(context)).toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });

  it('acepta un token válido y adjunta el usuario derivado del token', () => {
    const verify = jest
      .fn()
      .mockReturnValue({ sub: OWNER_ID, rol: 'validador' });
    const guard = crearGuard(verify);
    const { context, request } = crearContexto({
      authorization: `Bearer token-bueno`,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.usuario).toEqual({ ownerId: OWNER_ID, rol: 'validador' });
  });

  it('ignora cualquier owner_id que venga del cliente', () => {
    const verify = jest
      .fn()
      .mockReturnValue({ sub: OWNER_ID, rol: 'validador' });
    const guard = crearGuard(verify);
    const { context, request } = crearContexto({
      authorization: 'Bearer token-bueno',
      body: { owner_id: 'otro-usuario-suplantado' },
    });

    guard.canActivate(context);
    expect(request.usuario?.ownerId).toBe(OWNER_ID);
  });

  it('rechaza un token con claims inválidos (sub no uuid)', () => {
    const verify = jest
      .fn()
      .mockReturnValue({ sub: 'no-es-uuid', rol: 'validador' });
    const guard = crearGuard(verify);
    const { context } = crearContexto({ authorization: 'Bearer token' });

    expect(() => guard.canActivate(context)).toThrow(NoAutenticadoException);
  });
});

describe('Decoradores de usuario', () => {
  it('obtenerOwnerId devuelve el owner_id del usuario autenticado', () => {
    const { context } = crearContexto({
      usuario: { ownerId: OWNER_ID, rol: 'validador' },
    });

    expect(obtenerOwnerId(undefined, context)).toBe(OWNER_ID);
    expect(obtenerUsuarioActual(undefined, context)).toEqual({
      ownerId: OWNER_ID,
      rol: 'validador',
    });
  });
});
