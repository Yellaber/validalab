import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearContactos1783386141978 implements MigrationInterface {
  name = 'CrearContactos1783386141978';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "contactos" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "idea_id" uuid NOT NULL, "nombre" character varying NOT NULL, "perfil" character varying, "enlace" character varying, "canal" character varying NOT NULL, "origen" character varying NOT NULL, "referido_por_id" uuid, "estado" character varying NOT NULL DEFAULT 'por_contactar', "primer_toque_en" TIMESTAMP WITH TIME ZONE, "segundo_toque_en" TIMESTAMP WITH TIME ZONE, "notas" character varying, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d8a88d3690915aba8dc617a7ffd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5944c2c0dd36fc37efb2bf9c6c" ON "contactos" ("idea_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "contactos" ADD CONSTRAINT "FK_5944c2c0dd36fc37efb2bf9c6c5" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contactos" ADD CONSTRAINT "FK_e1548f69edf892fa778fa23a32e" FOREIGN KEY ("referido_por_id") REFERENCES "contactos"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contactos" DROP CONSTRAINT "FK_e1548f69edf892fa778fa23a32e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contactos" DROP CONSTRAINT "FK_5944c2c0dd36fc37efb2bf9c6c5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5944c2c0dd36fc37efb2bf9c6c"`,
    );
    await queryRunner.query(`DROP TABLE "contactos"`);
  }
}
