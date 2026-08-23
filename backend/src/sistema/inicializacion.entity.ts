import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Marcador de que el sistema ya fue inicializado. La tabla admite **como máximo
 * una fila**: `id` es la clave primaria y una restricción `CHECK (id = 1)` impide
 * cualquier otro valor.
 *
 * Esa unicidad no es decorativa — es el árbitro de la concurrencia. Dos peticiones
 * simultáneas a `POST /sistema/inicializar` sobre un sistema virgen no pueden
 * decidirse con un `SELECT` previo (ambas leerían «vacío»): se resuelven porque el
 * segundo `INSERT` viola la clave primaria, y esa violación se traduce a `409`.
 *
 * Los tres campos restantes son traza auditable de la puesta en marcha; ninguno
 * participa en la decisión.
 */
@Entity('inicializacion_sistema')
export class InicializacionSistema {
  /** Siempre 1. La restricción `CHECK` de la tabla no admite otro valor. */
  @PrimaryColumn({ type: 'int', default: 1 })
  id!: number;

  @Column({ name: 'ejecutado_en', type: 'timestamptz', default: () => 'now()' })
  ejecutadoEn!: Date;

  /** Versión de la aplicación que inicializó el sistema. */
  @Column({ type: 'varchar' })
  version!: string;

  /** Email de la cuenta administradora creada en la inicialización. */
  @Column({ name: 'admin_email', type: 'varchar' })
  adminEmail!: string;
}
