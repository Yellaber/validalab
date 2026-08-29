import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';

/** Parámetros de conexión a PostgreSQL (los provee `AppConfigService`). */
export interface DatabaseConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  /**
   * Conexión TLS. Los PostgreSQL gestionados la exigen; el local de
   * `docker-compose.yml` no la ofrece, de ahí que sea configurable.
   */
  ssl: boolean;
}

/**
 * Construye las opciones de TypeORM compartidas por la aplicación Nest
 * (`TypeOrmModule.forRootAsync`) y por la CLI de migraciones (`data-source.ts`),
 * de modo que ambos vean exactamente la misma configuración.
 *
 * Las migraciones son la fuente de verdad del esquema: `migrationsRun` es
 * `false` (nunca se ejecutan solas al arrancar) y `synchronize` solo se activa
 * vía entorno en un arranque local desechable.
 *
 * `ssl` se omite cuando está desactivado, en vez de pasarse como `false`: es la
 * forma en que `node-postgres` distingue «sin TLS» de «con TLS y estas
 * opciones». Cuando se activa, cifra el transporte pero NO verifica la cadena
 * de certificación —eso exigiría distribuir y rotar el certificado raíz del
 * proveedor—, así que protege la confidencialidad pero no frente a un
 * intermediario activo.
 */
export function buildDataSourceOptions(
  db: DatabaseConnectionConfig,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    synchronize: db.synchronize,
    ...(db.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
    migrationsRun: false,
    // Globs válidos tanto en ts-node (`.ts` bajo `src/`) como en el build
    // compilado (`.js` bajo `dist/`).
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  };
}
