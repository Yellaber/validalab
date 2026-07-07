import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea la tabla del catálogo de modelos (`modelos_ia`) y la siembra con un
 * conjunto inicial curado por proveedor. Los modelos son DATO (RNF-18):
 * administración los ajusta con un UPDATE/INSERT sin redesplegar. Los ids de
 * Anthropic son los vigentes; los de OpenAI/Google son un punto de partida.
 */
export class CrearModelosIa1783393662178 implements MigrationInterface {
  name = 'CrearModelosIa1783393662178';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "modelos_ia" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "proveedor" character varying NOT NULL, "modelo_id" character varying NOT NULL, "nombre" character varying NOT NULL, "descripcion" character varying, "orden" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_8c7609c5f30f903dfe0bc3674d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_10c5d2f216791d0314c4ea75d9" ON "modelos_ia" ("proveedor") `,
    );
    await queryRunner.query(
      `INSERT INTO "modelos_ia" ("proveedor", "modelo_id", "nombre", "descripcion", "orden") VALUES
        ('anthropic', 'claude-opus-4-8', 'Claude Opus 4.8', 'Modelo potente, idóneo para el veredicto de idea.', 1),
        ('anthropic', 'claude-sonnet-5', 'Claude Sonnet 5', 'Modelo equilibrado.', 2),
        ('anthropic', 'claude-haiku-4-5-20251001', 'Claude Haiku 4.5', 'Modelo económico, idóneo para el scoring de entrevistas.', 3),
        ('openai', 'gpt-4o', 'GPT-4o', 'Modelo potente de propósito general.', 1),
        ('openai', 'gpt-4o-mini', 'GPT-4o mini', 'Modelo económico.', 2),
        ('google', 'gemini-2.5-pro', 'Gemini 2.5 Pro', 'Modelo potente.', 1),
        ('google', 'gemini-2.5-flash', 'Gemini 2.5 Flash', 'Modelo económico.', 2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_10c5d2f216791d0314c4ea75d9"`,
    );
    await queryRunner.query(`DROP TABLE "modelos_ia"`);
  }
}
