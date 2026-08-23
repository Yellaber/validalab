import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración baseline de la fundación E0. No crea tablas de dominio todavía; solo
 * habilita la extensión `pgcrypto`, que provee `gen_random_uuid()` para las
 * claves primarias `uuid` que usarán las entidades de dominio.
 */
export class Baseline1782754350291 implements MigrationInterface {
  name = 'Baseline1782754350291';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pgcrypto"`);
  }
}
