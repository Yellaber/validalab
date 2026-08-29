import {
  buildDataSourceOptions,
  DatabaseConnectionConfig,
} from './typeorm-options';

describe('buildDataSourceOptions', () => {
  const conexion: DatabaseConnectionConfig = {
    host: 'localhost',
    port: 5432,
    username: 'validalab',
    password: 'secreto',
    database: 'validalab',
    synchronize: false,
    ssl: false,
  };

  it('nunca ejecuta migraciones al arrancar: son la fuente de verdad del esquema', () => {
    expect(buildDataSourceOptions(conexion).migrationsRun).toBe(false);
  });

  describe('SSL', () => {
    // `node-postgres` distingue «sin TLS» de «con TLS y estas opciones» por la
    // ausencia de la clave, no por un `false`.
    it('omite la clave `ssl` cuando está desactivado, para el PostgreSQL local', () => {
      const opciones = buildDataSourceOptions(conexion);

      expect(opciones).not.toHaveProperty('ssl');
    });

    it('activa TLS cuando el entorno lo pide, para PostgreSQL gestionado', () => {
      const opciones = buildDataSourceOptions({ ...conexion, ssl: true });

      expect(opciones).toHaveProperty('ssl');
    });
  });

  it('propaga los parámetros de conexión tal cual los recibe', () => {
    const opciones = buildDataSourceOptions({
      ...conexion,
      host: 'db.ejemplo.com',
      port: 6543,
      synchronize: true,
    });

    expect(opciones).toMatchObject({
      type: 'postgres',
      host: 'db.ejemplo.com',
      port: 6543,
      username: 'validalab',
      database: 'validalab',
      synchronize: true,
    });
  });
});
