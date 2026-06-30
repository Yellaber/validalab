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
}

/**
 * Construye las opciones de TypeORM compartidas por la aplicación Nest
 * (`TypeOrmModule.forRootAsync`) y por la CLI de migraciones (`data-source.ts`),
 * de modo que ambos vean exactamente la misma configuración.
 *
 * Las migraciones son la fuente de verdad del esquema: `migrationsRun` es
 * `false` (nunca se ejecutan solas al arrancar) y `synchronize` solo se activa
 * vía entorno en un arranque local desechable.
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
    migrationsRun: false,
    // Globs válidos tanto en ts-node (`.ts` bajo `src/`) como en el build
    // compilado (`.js` bajo `dist/`).
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  };
}
