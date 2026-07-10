import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

/** Tarea del agente que originó la ejecución. Hoy solo `scoring` (E4); el veredicto (E6) reutilizará esta traza. */
export type TareaAgente = 'scoring';
/** Modo en que corrió la capa agéntica. */
export type ModoAgente = 'real' | 'fake';
/** Desenlace de la ejecución del agente. */
export type EstadoEjecucion = 'exitosa' | 'fallida';

/**
 * Traza de una ejecución del agente Validador Inteligente (RF-AG-08). Registra,
 * por cada intento de scoring de una entrevista, el modo, el proveedor/modelo
 * usados, el desenlace, las iteraciones, los tokens (cuando el proveedor los
 * reporta), la salida validada y el motivo de error. Es append-only y sirve de
 * base para la trazabilidad y el costo estimado (E8). No es un checkpointer de
 * LangGraph: es el registro de dominio de qué hizo el agente.
 */
@Entity('ejecuciones_agente')
export class EjecucionAgente {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ name: 'entrevista_id', type: 'uuid' })
  entrevistaId!: string;

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
