import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearIdeas1782937036653 implements MigrationInterface {
  name = 'CrearIdeas1782937036653';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ideas" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "owner_id" uuid NOT NULL, "titulo" character varying NOT NULL, "descripcion" character varying, "problema" character varying NOT NULL, "segmento_beachhead" character varying, "estado" character varying NOT NULL DEFAULT 'borrador', "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6ab43f1e9b1cef0d8f3e56ce3a3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a17670e948a78dd6556051f678" ON "ideas" ("owner_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "ideas" ADD CONSTRAINT "FK_a17670e948a78dd6556051f6785" FOREIGN KEY ("owner_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ideas" DROP CONSTRAINT "FK_a17670e948a78dd6556051f6785"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a17670e948a78dd6556051f678"`,
    );
    await queryRunner.query(`DROP TABLE "ideas"`);
  }
}
