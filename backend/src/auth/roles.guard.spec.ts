import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AccesoDenegadoException,
  NoAutenticadoException,
} from '../common/errors/dominio.exception';
import { Rol, UsuarioAutenticado } from './claims';
import { RolesGuard } from './roles.guard';

function crearContexto(usuario?: UsuarioAutenticado): ExecutionContext {
  const request = { usuario };
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function crearGuard(roles?: Rol[]): RolesGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

const admin: UsuarioAutenticado = { ownerId: 'a1', rol: 'administrador' };
const validador: UsuarioAutenticado = { ownerId: 'u1', rol: 'validador' };

describe('RolesGuard', () => {
  it('deja pasar cuando el handler no declara @Roles', () => {
    expect(crearGuard(undefined).canActivate(crearContexto(validador))).toBe(
      true,
    );
  });

  it('deja pasar cuando la lista de roles está vacía', () => {
    expect(crearGuard([]).canActivate(crearContexto(validador))).toBe(true);
  });

  it('permite el acceso a un rol autorizado', () => {
    expect(
      crearGuard(['administrador']).canActivate(crearContexto(admin)),
    ).toBe(true);
  });

  it('deniega (ACCESO_DENEGADO) a un rol no autorizado', () => {
    expect(() =>
      crearGuard(['administrador']).canActivate(crearContexto(validador)),
    ).toThrow(AccesoDenegadoException);
  });

  it('rechaza (NO_AUTENTICADO) si el request no trae identidad', () => {
    expect(() =>
      crearGuard(['administrador']).canActivate(crearContexto(undefined)),
    ).toThrow(NoAutenticadoException);
  });
});
