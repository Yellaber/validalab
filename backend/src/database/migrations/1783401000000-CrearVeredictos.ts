import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea `veredictos`: el juicio razonado del agente sobre una idea (RF-14), con su
 * snapshot de KPIs congelado y su verificación humana. Sin FK a `ideas` (como el
 * resto de la evidencia histórica del dominio).
 */
export class CrearVeredictos1783401000000 implements MigrationInterface {
  name = 'CrearVeredictos1783401000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "veredictos" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "idea_id" uuid NOT NULL, "veredicto" character varying NOT NULL, "confianza" integer NOT NULL, "justificacion_por_kpi" jsonb NOT NULL, "recomendaciones" jsonb NOT NULL, "proveedor" character varying NOT NULL, "modelo" character varying NOT NULL, "snapshot_kpis" jsonb NOT NULL, "estado_verificacion" character varying NOT NULL DEFAULT 'pendiente', "verificacion" jsonb, "fecha_emision" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_veredictos" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_veredictos_idea" ON "veredictos" ("idea_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_veredictos_idea"`);
    await queryRunner.query(`DROP TABLE "veredictos"`);
  }
}
