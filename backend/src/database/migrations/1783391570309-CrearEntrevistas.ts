import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearEntrevistas1783391570309 implements MigrationInterface {
  name = 'CrearEntrevistas1783391570309';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "entrevistas" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "idea_id" uuid NOT NULL, "contacto_id" uuid NOT NULL, "guion_id" uuid NOT NULL, "respuestas" jsonb NOT NULL, "citas" jsonb NOT NULL DEFAULT '[]', "estado_scoring" character varying NOT NULL DEFAULT 'pendiente', "score" jsonb, "ajuste" jsonb, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b2e38afe43d0f8543dcb61efca4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b4a27253c5c2ff228e187e3115" ON "entrevistas" ("idea_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "entrevistas" ADD CONSTRAINT "FK_b4a27253c5c2ff228e187e3115f" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "entrevistas" DROP CONSTRAINT "FK_b4a27253c5c2ff228e187e3115f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b4a27253c5c2ff228e187e3115"`,
    );
    await queryRunner.query(`DROP TABLE "entrevistas"`);
  }
}
