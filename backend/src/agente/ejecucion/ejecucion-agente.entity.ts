import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

/** Tarea del agente que originó la ejecución: scoring de entrevista (E4) o veredicto de idea (E6). */
export type TareaAgente = 'scoring' | 'veredicto';
/** Modo en que corrió la capa agéntica. */
export type ModoAgente = 'real' | 'fake';
/** Desenlace de la ejecución del agente. */
export type EstadoEjecucion = 'exitosa' | 'fallida';

/**
 * Traza de CADA ejecución del agente Validador Inteligente (RF-AG-08), de
 * cualquier tarea (scoring de entrevista o veredicto de idea). Registra la idea,
 * la entrevista (cuando aplica; el veredicto no la tiene), el owner, el modo, el
 * proveedor/modelo, el desenlace, las iteraciones, los tokens (cuando el
 * proveedor los reporta), la salida validada y el motivo de error. Es append-only
 * y la fuente ÚNICA reconstruible de la trazabilidad y del costo estimado (E8).
 */
@Entity('ejecuciones_agente')
export class EjecucionAgente {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ name: 'idea_id', type: 'uuid', nullable: true })
  ideaId!: string | null;

  @Index()
  @Column({ name: 'entrevista_id', type: 'uuid', nullable: true })
  entrevistaId!: string | null;

  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'varchar' })
  tarea!: TareaAgente;

  @Column({ type: 'varchar' })
  modo!: ModoAgente;

  @Column({ type: 'varchar', nullable: true })
  proveedor!: string | null;

  @Column({ type: 'varchar', nullable: true })
  modelo!: string | null;

  @Column({ type: 'varchar' })
  estado!: EstadoEjecucion;

  @Column({ type: 'int', default: 0 })
  iteraciones!: number;

  @Column({ name: 'tokens_entrada', type: 'int', nullable: true })
  tokensEntrada!: number | null;

  @Column({ name: 'tokens_salida', type: 'int', nullable: true })
  tokensSalida!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  salida!: unknown;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;
}
