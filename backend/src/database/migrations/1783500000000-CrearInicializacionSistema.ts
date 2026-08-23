import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea `inicializacion_sistema`, el marcador de un solo uso que gobierna
 * `POST /sistema/inicializar`.
 *
 * La tabla admite **como máximo una fila**: `PRIMARY KEY (id)` más
 * `CHECK (id = 1)`. Es una restricción poco habitual y deliberada — es lo que
 * arbitra la carrera entre dos inicializaciones simultáneas, que no puede
 * resolverse con un `SELECT` previo porque ambas leerían «vacío». El segundo
 * `INSERT` viola la clave primaria y esa violación se traduce a `409 CONFLICTO`.
 *
 * La siembra condicional cubre los sistemas que YA operan con un administrador
 * creado a mano (con un `UPDATE` directo, que es justo lo que este trabajo viene
 * a eliminar). Sin ella, esos despliegues quedarían marcados como «no
 * inicializados» al actualizar y su endpoint de inicialización estaría
 * disponible — exactamente lo que todo el diseño intenta evitar.
 */
export class CrearInicializacionSistema1783500000000 implements MigrationInterface {
  name = 'CrearInicializacionSistema1783500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "inicializacion_sistema" ("id" integer NOT NULL DEFAULT 1, "ejecutado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" character varying NOT NULL, "admin_email" character varying NOT NULL, CONSTRAINT "PK_inicializacion_sistema" PRIMARY KEY ("id"), CONSTRAINT "CHK_inicializacion_sistema_fila_unica" CHECK ("id" = 1))`,
    );

    // Sistema ya operativo: si existe algún administrador, el sistema está de
    // hecho inicializado. Se siembra el marcador con el administrador más
    // antiguo para que el endpoint responda 409 desde el primer arranque.
    await queryRunner.query(
      `INSERT INTO "inicializacion_sistema" ("id", "ejecutado_en", "version", "admin_email")
       SELECT 1, "fecha_creacion", 'pre-migracion', "email"
       FROM "usuarios"
       WHERE "rol" = 'administrador'
       ORDER BY "fecha_creacion" ASC
       LIMIT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "inicializacion_sistema"`);
  }
}
