import { DataSource } from 'typeorm';
import {
  CLAVE_LOCK_MIGRACIONES,
  ejecutarMigracionesAlArranque,
} from './migraciones-al-arranque';

const executePendingMigrations = jest.fn();

jest.mock('typeorm', () => ({
  ...jest.requireActual<typeof import('typeorm')>('typeorm'),
  MigrationExecutor: jest.fn().mockImplementation(() => ({
    transaction: 'all',
    executePendingMigrations,
  })),
}));

const { MigrationExecutor } =
  jest.requireMock<typeof import('typeorm')>('typeorm');

describe('ejecutarMigracionesAlArranque', () => {
  /** Registra el orden de las llamadas, que es justo lo que hace correcta la coordinación. */
  let traza: string[];
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    query: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
  };
  let dataSource: DataSource;
  const logger = { log: jest.fn(), error: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    traza = [];
    /** Anota el paso en la traza y resuelve, como haría el runner real. */
    const anota = (paso: string) =>
      jest.fn(() => {
        traza.push(paso);
        return Promise.resolve();
      });
    queryRunner = {
      connect: anota('connect'),
      startTransaction: anota('begin'),
      query: anota('lock'),
      commitTransaction: anota('commit'),
      rollbackTransaction: anota('rollback'),
      release: anota('release'),
    };
    dataSource = {
      createQueryRunner: () => queryRunner,
    } as unknown as DataSource;
    executePendingMigrations.mockImplementation(() => {
      traza.push('migraciones');
      return Promise.resolve([]);
    });
  });

  it('toma el advisory lock ANTES de aplicar nada, para serializar las réplicas', async () => {
    await ejecutarMigracionesAlArranque(dataSource, logger);

    expect(traza.indexOf('lock')).toBeLessThan(traza.indexOf('migraciones'));
    expect(queryRunner.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1)',
      [CLAVE_LOCK_MIGRACIONES],
    );
  });

  // El lock de transacción, y no el de sesión, es lo que hace que esto funcione
  // a través de un pooler en modo transacción.
  it('encierra lock y migraciones en una única transacción', async () => {
    await ejecutarMigracionesAlArranque(dataSource, logger);

    expect(traza).toEqual([
      'connect',
      'begin',
      'lock',
      'migraciones',
      'commit',
      'release',
    ]);
  });

  it('impide que el ejecutor abra transacciones propias sobre las nuestras', async () => {
    await ejecutarMigracionesAlArranque(dataSource, logger);

    const ejecutor = (MigrationExecutor as unknown as jest.Mock).mock.results[0]
      .value as { transaction: string };
    expect(ejecutor.transaction).toBe('none');
  });

  it('devuelve los nombres aplicados y los registra', async () => {
    executePendingMigrations.mockResolvedValue([
      { name: 'CrearIdeas1782937036653' },
    ]);

    const aplicadas = await ejecutarMigracionesAlArranque(dataSource, logger);

    expect(aplicadas).toEqual(['CrearIdeas1782937036653']);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('CrearIdeas1782937036653'),
    );
  });

  it('sin pendientes no toca el esquema y lo dice', async () => {
    const aplicadas = await ejecutarMigracionesAlArranque(dataSource, logger);

    expect(aplicadas).toEqual([]);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('ninguna migración pendiente'),
    );
  });

  describe('cuando una migración falla', () => {
    const fallo = new Error('relación «ideas» ya existe');

    beforeEach(() => {
      executePendingMigrations.mockRejectedValue(fallo);
    });

    // Arrancar con el esquema a medias es peor que no arrancar: el proceso no
    // debe llegar a escuchar.
    it('deshace la transacción y propaga el error', async () => {
      await expect(
        ejecutarMigracionesAlArranque(dataSource, logger),
      ).rejects.toThrow(fallo);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('libera la conexión igualmente, para no dejarla ocupada en el pooler', async () => {
      await expect(
        ejecutarMigracionesAlArranque(dataSource, logger),
      ).rejects.toThrow(fallo);

      expect(queryRunner.release).toHaveBeenCalled();
      expect(traza[traza.length - 1]).toBe('release');
    });
  });
});
