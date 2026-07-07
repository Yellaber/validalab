import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearConfiguracionesByok1783396078445 implements MigrationInterface {
  name = 'CrearConfiguracionesByok1783396078445';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "configuraciones_byok" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "owner_id" uuid NOT NULL, "proveedor" character varying NOT NULL, "modelo_scoring" character varying NOT NULL, "modelo_veredicto" character varying NOT NULL, "api_key_cifrada" character varying NOT NULL, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c39425f90c6259a87bbf629ae44" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d068bd03705fa4f80e51c5b754" ON "configuraciones_byok" ("owner_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "configuraciones_byok" ADD CONSTRAINT "FK_d068bd03705fa4f80e51c5b754d" FOREIGN KEY ("owner_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "configuraciones_byok" DROP CONSTRAINT "FK_d068bd03705fa4f80e51c5b754d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d068bd03705fa4f80e51c5b754"`,
    );
    await queryRunner.query(`DROP TABLE "configuraciones_byok"`);
  }
}
