import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea `alertas` (cruces de umbral emitidos por el sistema, RF-13) y
 * `estado_semaforo_kpi` (última zona conocida por idea+KPI, para detectar el
 * cruce). Sin FK a `ideas` (como el resto de la evidencia histórica del dominio);
 * `estado_semaforo_kpi` es único por `(idea_id, kpi)`.
 */
export class CrearAlertasYSemaforoKpi1783400000000 implements MigrationInterface {
  name = 'CrearAlertasYSemaforoKpi1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "alertas" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "idea_id" uuid NOT NULL, "kpi" character varying NOT NULL, "tipo" character varying NOT NULL, "valor" double precision NOT NULL, "umbral" double precision NOT NULL, "leida" boolean NOT NULL DEFAULT false, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_alertas" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_alertas_idea" ON "alertas" ("idea_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "estado_semaforo_kpi" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "idea_id" uuid NOT NULL, "kpi" character varying NOT NULL, "zona" character varying NOT NULL, "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_estado_semaforo_kpi" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_estado_semaforo_kpi_idea_kpi" ON "estado_semaforo_kpi" ("idea_id", "kpi") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_estado_semaforo_kpi_idea_kpi"`,
    );
    await queryRunner.query(`DROP TABLE "estado_semaforo_kpi"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_alertas_idea"`);
    await queryRunner.query(`DROP TABLE "alertas"`);
  }
}
