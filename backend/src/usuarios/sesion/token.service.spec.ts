import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AppConfigService } from '../../config/app-config.service';
import { NoAutenticadoException } from '../../common/errors/dominio.exception';
import { Sesion } from './sesion.entity';
import { ServicioDeTokens } from './token.service';

const OWNER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

type RepoMock = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
};

function crearRepoMock(): RepoMock {
  return {
    create: jest.fn((x: Partial<Sesion>) => x),
    save: jest.fn((x: Sesion) => Promise.resolve(x)),
    findOne: jest.fn(),
  };
}

function crearServicio(repo: RepoMock): {
  servicio: ServicioDeTokens;
  jwt: JwtService;
} {
  const jwt = new JwtService({
    secret: 'secreto-de-prueba',
    signOptions: { expiresIn: '15m' },
  });
  const config = {
    session: { refreshTokenTtl: '30d' },
  } as AppConfigService;
  const servicio = new ServicioDeTokens(
    jwt,
    config,
    repo as unknown as Repository<Sesion>,
  );
  return { servicio, jwt };
}

function sesionVigente(parcial: Partial<Sesion> = {}): Sesion {
  return {
    id: 's1',
    usuarioId: OWNER_ID,
    tokenHash: 'hash',
    expiraEn: new Date(Date.now() + 60_000),
    revocadoEn: null,
    fechaCreacion: new Date(),
    ...parcial,
  } as Sesion;
}

describe('ServicioDeTokens', () => {
  describe('firmarAccessToken', () => {
    it('firma un JWT con claims { sub, rol } y calcula expiraEn en segundos', () => {
      const { servicio, jwt } = crearServicio(crearRepoMock());

      const { accessToken, expiraEn } = servicio.firmarAccessToken({
        id: OWNER_ID,
        rol: 'validador',
      });

      const payload = jwt.verify<{ sub: string; rol: string }>(accessToken);
      expect(payload.sub).toBe(OWNER_ID);
      expect(payload.rol).toBe('validador');
      expect(expiraEn).toBe(15 * 60);
    });
  });

  describe('hashRefresh', () => {
    it('es determinista y distinto para tokens distintos', () => {
      const { servicio } = crearServicio(crearRepoMock());

      expect(servicio.hashRefresh('abc')).toBe(servicio.hashRefresh('abc'));
      expect(servicio.hashRefresh('abc')).not.toBe(servicio.hashRefresh('xyz'));
    });
  });

  describe('emitirRefreshToken', () => {
    it('persiste la sesión con el hash del token y devuelve el token en claro', async () => {
      const repo = crearRepoMock();
      const { servicio } = crearServicio(repo);

      const token = await servicio.emitirRefreshToken(OWNER_ID);

      expect(token).toBeTruthy();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: OWNER_ID,
          tokenHash: servicio.hashRefresh(token),
        }),
      );
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('rotarRefreshToken', () => {
    it('revoca la sesión vigente y emite un refresh nuevo', async () => {
      const repo = crearRepoMock();
      const actual = sesionVigente();
      repo.findOne.mockResolvedValue(actual);
      const { servicio } = crearServicio(repo);

      const res = await servicio.rotarRefreshToken('token-plano');

      expect(actual.revocadoEn).not.toBeNull(); // la anterior queda revocada
      expect(res.usuarioId).toBe(OWNER_ID);
      expect(res.refreshToken).toBeTruthy();
      // save: revocar la anterior + guardar la nueva
      expect(repo.save).toHaveBeenCalledTimes(2);
    });

    it('rechaza un refresh inexistente', async () => {
      const repo = crearRepoMock();
      repo.findOne.mockResolvedValue(null);
      const { servicio } = crearServicio(repo);

      await expect(servicio.rotarRefreshToken('x')).rejects.toBeInstanceOf(
        NoAutenticadoException,
      );
    });

    it('rechaza un refresh ya revocado o expirado', async () => {
      const repoRevocado = crearRepoMock();
      repoRevocado.findOne.mockResolvedValue(
        sesionVigente({ revocadoEn: new Date() }),
      );
      await expect(
        crearServicio(repoRevocado).servicio.rotarRefreshToken('x'),
      ).rejects.toBeInstanceOf(NoAutenticadoException);

      const repoExpirado = crearRepoMock();
      repoExpirado.findOne.mockResolvedValue(
        sesionVigente({ expiraEn: new Date(Date.now() - 1000) }),
      );
      await expect(
        crearServicio(repoExpirado).servicio.rotarRefreshToken('x'),
      ).rejects.toBeInstanceOf(NoAutenticadoException);
    });
  });

  describe('revocarRefreshToken', () => {
    it('revoca la sesión del refresh presentado', async () => {
      const repo = crearRepoMock();
      const sesion = sesionVigente();
      repo.findOne.mockResolvedValue(sesion);
      const { servicio } = crearServicio(repo);

      await servicio.revocarRefreshToken('token-plano');

      expect(sesion.revocadoEn).not.toBeNull();
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('es idempotente si la sesión no existe', async () => {
      const repo = crearRepoMock();
      repo.findOne.mockResolvedValue(null);
      const { servicio } = crearServicio(repo);

      await expect(
        servicio.revocarRefreshToken('inexistente'),
      ).resolves.toBeUndefined();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
