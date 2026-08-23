import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearUsuariosYSesiones1782785194388 implements MigrationInterface {
  name = 'CrearUsuariosYSesiones1782785194388';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "usuarios" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying NOT NULL, "nombre" character varying NOT NULL, "password_hash" character varying NOT NULL, "rol" character varying NOT NULL DEFAULT 'validador', "estado" character varying NOT NULL DEFAULT 'activo', "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_446adfc18b35418aac32ae0b7b" ON "usuarios" ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "sesiones" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "usuario_id" uuid NOT NULL, "token_hash" character varying NOT NULL, "expira_en" TIMESTAMP WITH TIME ZONE NOT NULL, "revocado_en" TIMESTAMP WITH TIME ZONE, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e4237ef09f1dc217c1660f23253" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_be14eb22d2e8fbf2ca6c3fe0d5" ON "sesiones" ("usuario_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_91fcd282063ba2dc5ced2b835c" ON "sesiones" ("token_hash") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sesiones" ADD CONSTRAINT "FK_be14eb22d2e8fbf2ca6c3fe0d56" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sesiones" DROP CONSTRAINT "FK_be14eb22d2e8fbf2ca6c3fe0d56"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_91fcd282063ba2dc5ced2b835c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_be14eb22d2e8fbf2ca6c3fe0d5"`,
    );
    await queryRunner.query(`DROP TABLE "sesiones"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_446adfc18b35418aac32ae0b7b"`,
    );
    await queryRunner.query(`DROP TABLE "usuarios"`);
  }
}
