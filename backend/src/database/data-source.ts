import 'dotenv/config';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.schema';
import { buildDataSourceOptions } from './typeorm-options';

/**
 * `DataSource` para la CLI de TypeORM (migraciones). Se ejecuta FUERA de Nest,
 * así que carga el `.env` con dotenv y valida el entorno con el mismo esquema
 * Zod que usa la aplicación. La app, en cambio, construye la conexión vía
 * `DatabaseModule` con `AppConfigService`; ambos comparten `buildDataSourceOptions`.
 */
const env = validateEnv(process.env);

export default new DataSource(
  buildDataSourceOptions({
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    synchronize: env.DB_SYNCHRONIZE,
  }),
);
