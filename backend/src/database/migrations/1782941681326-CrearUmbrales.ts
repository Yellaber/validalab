import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearUmbrales1782941681326 implements MigrationInterface {
  name = 'CrearUmbrales1782941681326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "umbrales" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "idea_id" uuid NOT NULL, "kpi" character varying NOT NULL, "umbral_go" double precision NOT NULL, "umbral_kill" double precision, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_1d8e08aa8197ec5093b25764aa6" UNIQUE ("idea_id", "kpi"), CONSTRAINT "PK_fbe9e5c1235b88609d593d9a320" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8bca80d317b6296b8ab2d3b659" ON "umbrales" ("idea_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "umbrales" ADD CONSTRAINT "FK_8bca80d317b6296b8ab2d3b659d" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "umbrales" DROP CONSTRAINT "FK_8bca80d317b6296b8ab2d3b659d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8bca80d317b6296b8ab2d3b659"`,
    );
    await queryRunner.query(`DROP TABLE "umbrales"`);
  }
}
