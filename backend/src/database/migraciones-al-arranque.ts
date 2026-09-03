import { Logger } from '@nestjs/common';
import { DataSource, MigrationExecutor } from 'typeorm';

/**
 * Clave del advisory lock que serializa las migraciones. El valor concreto es
 * arbitrario pero DEBE ser estable: dos procesos solo se coordinan si usan el
 * mismo número. Son los bytes ASCII de `VALI`, para que no colisione por
 * casualidad con el lock de otra aplicación sobre la misma base.
 */
export const CLAVE_LOCK_MIGRACIONES = 0x56414c49;

/**
 * Aplica las migraciones pendientes al arrancar, serializando las réplicas con
 * un advisory lock de PostgreSQL.
 *
 * El problema que resuelve el lock es la carrera: si varias réplicas arrancan a
 * la vez, todas ven las mismas migraciones pendientes y todas intentan
 * aplicarlas. La primera toma el lock y trabaja; las demás se BLOQUEAN en el
 * `pg_advisory_xact_lock` —no fallan— y cuando entran ya no queda nada
 * pendiente, así que salen sin tocar el esquema.
 *
 * Por qué `pg_advisory_xact_lock` y no `pg_advisory_lock`: el de sesión se
 * libera con la sesión, y la aplicación habla con PostgreSQL a través de un
 * pooler en **modo transacción**, donde la sesión no es estable entre consultas.
 * El de transacción se libera al terminar la transacción y vive dentro de ella,
 * que sí viaja entera por la misma conexión.
 *
 * De ahí que todo ocurra en UNA transacción propia: se abre, se toma el lock, y
 * el `MigrationExecutor` recibe ese mismo `queryRunner` con `transaction:
 * 'none'` para que no abra transacciones por su cuenta. Si una migración falla,
 * el rollback deshace también el registro en la tabla `migrations`, y el error
 * se relanza para que el proceso no llegue a escuchar: código nuevo contra un
 * esquema a medias es peor que no arrancar.
 *
 * Consecuencia a tener presente: al ir todo en una transacción, una migración
 * con DDL no transaccional (`CREATE INDEX CONCURRENTLY`, por ejemplo) no puede
 * ejecutarse por esta vía.
 */
export async function ejecutarMigracionesAlArranque(
  dataSource: DataSource,
  logger: Pick<Logger, 'log' | 'error'> = new Logger('Migraciones'),
): Promise<string[]> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Bloquea hasta que la réplica que va por delante termine su transacción.
    await queryRunner.query('SELECT pg_advisory_xact_lock($1)', [
      CLAVE_LOCK_MIGRACIONES,
    ]);

    const ejecutor = new MigrationExecutor(dataSource, queryRunner);
    ejecutor.transaction = 'none';

    const aplicadas = await ejecutor.executePendingMigrations();
    await queryRunner.commitTransaction();

    const nombres = aplicadas.map((m) => m.name);
    logger.log(
      nombres.length === 0
        ? 'Esquema al día: ninguna migración pendiente.'
        : `Migraciones aplicadas (${nombres.length}): ${nombres.join(', ')}`,
    );
    return nombres;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error(
      'Fallo al aplicar las migraciones; el arranque se aborta.',
      error instanceof Error ? error.stack : String(error),
    );
    throw error;
  } finally {
    await queryRunner.release();
  }
}
