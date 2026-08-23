import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea `precios_modelo` (tabla de precios por modelo, RF-22e) y la siembra con
 * precios reales APROXIMADOS por millón de tokens (entrada / salida / entrada
 * cacheada) para cada modelo del catálogo. Son datos editables sin redesplegar
 * (RNF-18): administración los mantiene; el seed es un valor por defecto útil.
 */
export class CrearPreciosModelo1783403000000 implements MigrationInterface {
  name = 'CrearPreciosModelo1783403000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "precios_modelo" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "proveedor" character varying NOT NULL, "modelo_id" character varying NOT NULL, "precio_entrada_por_millon" double precision NOT NULL, "precio_salida_por_millon" double precision NOT NULL, "precio_entrada_cacheada_por_millon" double precision, "moneda" character varying NOT NULL DEFAULT 'USD', "vigente_desde" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_precios_modelo" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "precios_modelo" ("proveedor", "modelo_id", "precio_entrada_por_millon", "precio_salida_por_millon", "precio_entrada_cacheada_por_millon", "moneda", "vigente_desde") VALUES
        ('anthropic', 'claude-opus-4-8', 5.00, 25.00, 0.50, 'USD', now()),
        ('anthropic', 'claude-sonnet-5', 3.00, 15.00, 0.30, 'USD', now()),
        ('anthropic', 'claude-haiku-4-5-20251001', 1.00, 5.00, 0.10, 'USD', now()),
        ('openai', 'gpt-4o', 2.50, 10.00, 1.25, 'USD', now()),
        ('openai', 'gpt-4o-mini', 0.15, 0.60, 0.075, 'USD', now()),
        ('google', 'gemini-2.5-pro', 1.25, 10.00, 0.3125, 'USD', now()),
        ('google', 'gemini-2.5-flash', 0.30, 2.50, 0.075, 'USD', now())`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "precios_modelo"`);
  }
}
