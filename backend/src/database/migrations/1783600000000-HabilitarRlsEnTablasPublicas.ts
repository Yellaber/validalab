import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Activa Row Level Security en todas las tablas del esquema de la aplicación.
 *
 * **No** implementa el aislamiento multi-tenant: ese sigue siendo el filtro por
 * `owner_id` que aplica el backend en cada consulta. Esto es una barrera contra
 * un acceso que rodea al backend por completo.
 *
 * El motivo es Supabase: publica el esquema `public` a través de PostgREST, de
 * modo que sin RLS `usuarios` (hashes de contraseña) y `configuraciones_byok`
 * (API keys cifradas) quedan legibles y escribibles por cualquiera que tenga la
 * clave *publicable* —una clave diseñada para viajar en un cliente—, sin pasar
 * por NestJS y por tanto sin pasar por el filtro de `owner_id`.
 *
 * Sin políticas asociadas, RLS **deniega por defecto**: es justo lo que se
 * quiere, porque ningún rol debe leer estas tablas salvo la aplicación. Y la
 * aplicación no se ve afectada: se conecta como el **dueño de las tablas**, y
 * el dueño no está sujeto a RLS mientras no se use `FORCE ROW LEVEL SECURITY`
 * —que deliberadamente no se usa—. Vale tanto para Supabase, donde además el
 * rol `postgres` tiene `BYPASSRLS`, como para el PostgreSQL local, donde el
 * dueño es el usuario de la aplicación.
 *
 * Se recorre el catálogo en vez de enumerar las tablas: así la migración vale
 * igual en un entorno que tenga exactamente este esquema y en uno que arrastre
 * alguna tabla más, y no hay una lista que se desincronice del modelo.
 *
 * Ojo al verificarlo contra la Data API: con RLS denegando, PostgREST responde
 * `200` con `[]`, no `403`. Sobre una tabla vacía eso es indistinguible de
 * «funciona»; hay que consultar una tabla **con filas** (`modelos_ia`) y
 * comprobar que el rol anónimo ve cero.
 *
 * Esto cubre las tablas existentes al aplicarse. Una tabla creada por una
 * migración posterior nace **sin** RLS: la medida que cubre también ese caso es
 * quitar `public` de los esquemas expuestos en el panel de Supabase, y por eso
 * ambas se aplican juntas.
 */
export class HabilitarRlsEnTablasPublicas1783600000000 implements MigrationInterface {
  name = 'HabilitarRlsEnTablasPublicas1783600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE tabla record;
      BEGIN
        FOR tabla IN
          SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = current_schema() AND c.relkind = 'r'
        LOOP
          EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabla.relname);
        END LOOP;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir reabre la lectura por PostgREST en un despliegue Supabase. Es el
    // inverso literal de `up`, como debe ser, pero no es una operación inocua.
    await queryRunner.query(`
      DO $$
      DECLARE tabla record;
      BEGIN
        FOR tabla IN
          SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = current_schema() AND c.relkind = 'r'
        LOOP
          EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tabla.relname);
        END LOOP;
      END $$;
    `);
  }
}
