import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearGuiones1783388910491 implements MigrationInterface {
  name = 'CrearGuiones1783388910491';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "guiones" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "owner_id" uuid NOT NULL, "nombre" character varying NOT NULL, "descripcion" character varying, "preguntas" jsonb NOT NULL, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_79252f359687e8851df3a9892f0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4028e71b49f4e16d5b20421fd0" ON "guiones" ("owner_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "guiones" ADD CONSTRAINT "FK_4028e71b49f4e16d5b20421fd0b" FOREIGN KEY ("owner_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "guiones" DROP CONSTRAINT "FK_4028e71b49f4e16d5b20421fd0b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4028e71b49f4e16d5b20421fd0"`,
    );
    await queryRunner.query(`DROP TABLE "guiones"`);
  }
}
