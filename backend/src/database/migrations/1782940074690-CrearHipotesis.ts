import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearHipotesis1782940074690 implements MigrationInterface {
  name = 'CrearHipotesis1782940074690';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "hipotesis" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "idea_id" uuid NOT NULL, "tipo" character varying NOT NULL, "enunciado" character varying NOT NULL, "estado" character varying NOT NULL DEFAULT 'pendiente', "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_eceb5c0ed19cb8e9039b2b5af44" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17c0dab73aef4684393ff5f1ee" ON "hipotesis" ("idea_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "hipotesis" ADD CONSTRAINT "FK_17c0dab73aef4684393ff5f1ee4" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hipotesis" DROP CONSTRAINT "FK_17c0dab73aef4684393ff5f1ee4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17c0dab73aef4684393ff5f1ee"`,
    );
    await queryRunner.query(`DROP TABLE "hipotesis"`);
  }
}
