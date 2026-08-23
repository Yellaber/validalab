import type { Request, Response } from 'express';
import { NoAutenticadoException } from '../../common/errors/dominio.exception';
import { AppConfigService } from '../../config/app-config.service';
import { NOMBRE_COOKIE_REFRESH } from '../sesion/cookie-sesion';
import { UsuariosController } from './usuarios.controller';
import { SesionEmitida } from './usuario-respuesta';
import { UsuariosService } from './usuarios.service';

/**
 * Verifica el cableado HTTP de la cookie de refresh en el controlador (lo que las
 * specs del servicio no cubren, porque el servicio no toca `Response`): login y
 * refresh escriben la cookie `HttpOnly` con el refresh token y devuelven el cuerpo
 * sin él; logout la lee y la limpia de forma idempotente.
 */
type ServicioMock = {
  login: jest.Mock;
  refrescar: jest.Mock;
  logout: jest.Mock;
};

const REFRESH_TTL_MS = 30 * 86_400_000;

function crear(): {
  controlador: UsuariosController;
  servicio: ServicioMock;
  res: { cookie: jest.Mock; clearCookie: jest.Mock };
} {
  const servicio: ServicioMock = {
    login: jest.fn(),
    refrescar: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    cookie: { secure: true },
    session: { refreshTtlMs: REFRESH_TTL_MS },
  } as AppConfigService;
  const controlador = new UsuariosController(
    servicio as unknown as UsuariosService,
    config,
  );
  const res = { cookie: jest.fn(), clearCookie: jest.fn() };
  return { controlador, servicio, res };
}

function sesion(refreshToken = 'RT'): SesionEmitida {
  return {
    cuerpo: {
      accessToken: 'AT',
      tokenTipo: 'Bearer',
      expiraEn: 900,
      usuario: {
        id: 'u1',
        email: 'ana@ejemplo.com',
        nombre: 'Ana',
        rol: 'validador',
        estado: 'activo',
        fechaCreacion: '2026-01-01T00:00:00.000Z',
      },
    },
    refreshToken,
  };
}

function reqConCookie(refreshToken?: string): Request {
  return {
    cookies: refreshToken ? { [NOMBRE_COOKIE_REFRESH]: refreshToken } : {},
  } as unknown as Request;
}

describe('UsuariosController.login', () => {
  it('escribe la cookie HttpOnly del refresh y devuelve el cuerpo sin refresh', async () => {
    const { controlador, servicio, res } = crear();
    servicio.login.mockResolvedValue(sesion('RT'));

    const cuerpo = await controlador.login(
      { email: 'ana@ejemplo.com', password: 'x' },
      res as unknown as Response,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      NOMBRE_COOKIE_REFRESH,
      'RT',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        secure: true,
        path: '/usuarios',
        maxAge: REFRESH_TTL_MS,
      }),
    );
    expect(cuerpo.accessToken).toBe('AT');
    expect(cuerpo).not.toHaveProperty('refreshToken');
  });
});

describe('UsuariosController.refrescar', () => {
  it('lee la cookie, rota y reescribe la cookie con el refresh nuevo', async () => {
    const { controlador, servicio, res } = crear();
    servicio.refrescar.mockResolvedValue(sesion('RT2'));

    const cuerpo = await controlador.refrescar(
      reqConCookie('RT-viejo'),
      res as unknown as Response,
    );

    expect(servicio.refrescar).toHaveBeenCalledWith('RT-viejo');
    expect(res.cookie).toHaveBeenCalledWith(
      NOMBRE_COOKIE_REFRESH,
      'RT2',
      expect.objectContaining({ httpOnly: true, path: '/usuarios' }),
    );
    expect(cuerpo).not.toHaveProperty('refreshToken');
  });

  it('sin cookie de refresh lanza NoAutenticado y no llama al servicio', async () => {
    const { controlador, servicio, res } = crear();

    await expect(
      controlador.refrescar(reqConCookie(), res as unknown as Response),
    ).rejects.toBeInstanceOf(NoAutenticadoException);
    expect(servicio.refrescar).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
  });
});

describe('UsuariosController.logout', () => {
  it('revoca el refresh de la cookie y limpia la cookie', async () => {
    const { controlador, servicio, res } = crear();

    await controlador.logout(
      reqConCookie('RT-vigente'),
      res as unknown as Response,
    );

    expect(servicio.logout).toHaveBeenCalledWith('RT-vigente');
    expect(res.clearCookie).toHaveBeenCalledWith(
      NOMBRE_COOKIE_REFRESH,
      expect.objectContaining({ httpOnly: true, path: '/usuarios' }),
    );
  });

  it('sin cookie es idempotente: no revoca nada pero limpia igualmente', async () => {
    const { controlador, servicio, res } = crear();

    await controlador.logout(reqConCookie(), res as unknown as Response);

    expect(servicio.logout).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith(
      NOMBRE_COOKIE_REFRESH,
      expect.objectContaining({ path: '/usuarios' }),
    );
  });
});
