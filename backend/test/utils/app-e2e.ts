import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configurarApp } from '../../src/configurar-app';

/** Tablas cuyo contenido NO se limpia entre pruebas. */
const TABLAS_PRESERVADAS = [
  // Borrarla haría que TypeORM creyera el esquema sin aplicar.
  'migrations',
  // Catálogos sembrados por migración: son datos de referencia, no estado de
  // prueba. El scoring y el costo los necesitan disponibles.
  'modelos_ia',
  'precios_modelo',
];

export interface AppE2E {
  app: INestApplication;
  dataSource: DataSource;
}

/**
 * Crea la base de datos de test si no existe, conectándose a la base
 * administrativa `postgres` con un `DataSource` desechable.
 *
 * Se usa TypeORM y no el cliente `pg` directo para no añadir `@types/pg` al
 * proyecto por una única función.
 *
 * Que la suite se encargue de esto es lo que hace que `npm run test:e2e`
 * funcione en una máquina limpia sin pasos manuales previos.
 */
async function crearBaseSiNoExiste(): Promise<void> {
  const nombre = process.env.DB_DATABASE!;
  const administrativa = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });

  try {
    await administrativa.initialize();
  } catch (error) {
    // Fallar explícitamente, nunca omitir la suite: un e2e que se salta a sí
    // mismo cuando no hay base reintroduce el falso verde que esta suite existe
    // para eliminar.
    throw new Error(
      `No hay un PostgreSQL accesible en ${process.env.DB_HOST}:${process.env.DB_PORT}. ` +
        'Levanta la base con `docker compose up -d` desde `backend/`.',
      { cause: error },
    );
  }

  try {
    const existentes: unknown[] = await administrativa.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [nombre],
    );
    if (existentes.length === 0) {
      // El nombre no puede parametrizarse en un CREATE DATABASE; viene de la
      // configuración de la suite, no de entrada de usuario.
      await administrativa.query(`CREATE DATABASE "${nombre}"`);
    }
  } finally {
    await administrativa.destroy();
  }
}

/**
 * Levanta la aplicación completa para la suite e2e: base de test lista,
 * migraciones aplicadas y la MISMA configuración de bootstrap que usa `main.ts`.
 *
 * No sustituye guards, pipes, filtros ni repositorios por dobles: la petición
 * atraviesa el camino real y la persistencia va contra PostgreSQL.
 */
export async function crearAppE2E(): Promise<AppE2E> {
  await crearBaseSiNoExiste();

  const moduloDeTest = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduloDeTest.createNestApplication();
  configurarApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  // El esquema lo crean las MIGRACIONES, no `synchronize`. Aplicarlas en cada
  // ejecución añade una verificación gratis: una migración rota hace fallar la
  // suite en vez de descubrirse al desplegar.
  await dataSource.runMigrations();

  return { app, dataSource };
}

/**
 * Vacía el estado entre pruebas. Un único `TRUNCATE ... CASCADE` es
 * prácticamente instantáneo, frente a recrear el esquema (16 migraciones) por
 * test.
 */
export async function limpiarBaseDeDatos(
  dataSource: DataSource,
): Promise<void> {
  const tablas = dataSource.entityMetadatas
    .map((metadata) => metadata.tableName)
    .filter((tabla) => !TABLAS_PRESERVADAS.includes(tabla))
    .map((tabla) => `"${tabla}"`);

  if (tablas.length === 0) {
    return;
  }

  await dataSource.query(
    `TRUNCATE TABLE ${tablas.join(', ')} RESTART IDENTITY CASCADE`,
  );
}

/** Cierra la app y su conexión, para que Jest no quede colgado al terminar. */
export async function cerrarAppE2E({ app }: AppE2E): Promise<void> {
  // `app.close()` cierra también el DataSource gestionado por TypeOrmModule.
  await app.close();
}
