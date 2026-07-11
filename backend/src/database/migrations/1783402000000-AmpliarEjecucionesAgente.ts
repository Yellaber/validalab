import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Amplía `ejecuciones_agente` para que sea el ledger único de TODA ejecución del
 * agente (E8): añade `idea_id` (nullable; lo llenan las ejecuciones nuevas y las
 * de scoring; las históricas quedan sin idea) y hace `entrevista_id` nullable
 * (el veredicto no tiene entrevista).
 */
export class AmpliarEjecucionesAgente1783402000000 implements MigrationInterface {
  name = 'AmpliarEjecucionesAgente1783402000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ejecuciones_agente" ADD "idea_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ejecuciones_agente_idea" ON "ejecuciones_agente" ("idea_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "ejecuciones_agente" ALTER COLUMN "entrevista_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ejecuciones_agente" ALTER COLUMN "entrevista_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ejecuciones_agente_idea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejecuciones_agente" DROP COLUMN "idea_id"`,
    );
  }
}
