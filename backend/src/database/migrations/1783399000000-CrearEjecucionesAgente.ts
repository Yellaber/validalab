import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea `ejecuciones_agente`: la traza append-only de cada ejecución del agente
 * (RF-AG-08). Sin FK a `entrevistas` (igual que `entrevista.contacto_id`), para
 * conservar la traza como evidencia histórica aunque la entrevista cambie.
 */
export class CrearEjecucionesAgente1783399000000 implements MigrationInterface {
  name = 'CrearEjecucionesAgente1783399000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ejecuciones_agente" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "entrevista_id" uuid NOT NULL, "owner_id" uuid NOT NULL, "tarea" character varying NOT NULL, "modo" character varying NOT NULL, "proveedor" character varying, "modelo" character varying, "estado" character varying NOT NULL, "iteraciones" integer NOT NULL DEFAULT 0, "tokens_entrada" integer, "tokens_salida" integer, "salida" jsonb, "error" text, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ejecuciones_agente" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ejecuciones_agente_entrevista" ON "ejecuciones_agente" ("entrevista_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ejecuciones_agente_owner" ON "ejecuciones_agente" ("owner_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ejecuciones_agente_owner"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ejecuciones_agente_entrevista"`,
    );
    await queryRunner.query(`DROP TABLE "ejecuciones_agente"`);
  }
}
