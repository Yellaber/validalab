import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Idea } from '../../ideas/idea/idea.entity';
import type {
  AjusteScore,
  Cita,
  EstadoScoring,
  RespuestaEntrevista,
  ScoreEntrevista,
} from './entrevista.types';

/**
 * Entrevista de descubrimiento vinculada a una idea y a un contacto del mismo
 * usuario (RNF-14). Cuelga de la idea (`idea_id`, FK ON DELETE CASCADE) y hereda
 * su aislamiento. `respuestas`, `citas`, `score` y `ajuste` se embeben como
 * jsonb. El vínculo con `contacto`/`guion` se guarda por id (validado en la app,
 * sin FK) para conservar la entrevista como evidencia histórica. El bloque
 * `score` lo produce el agente (chunk C); aquí nace `null` con `estadoScoring`
 * `pendiente`.
 */
@Entity('entrevistas')
export class Entrevista {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ name: 'idea_id', type: 'uuid' })
  ideaId!: string;

  @ManyToOne(() => Idea, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idea_id' })
  idea!: Idea;

  @Column({ name: 'contacto_id', type: 'uuid' })
  contactoId!: string;

  @Column({ name: 'guion_id', type: 'uuid' })
  guionId!: string;

  @Column({ type: 'jsonb' })
  respuestas!: RespuestaEntrevista[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  citas!: Cita[];

  @Column({ name: 'estado_scoring', type: 'varchar', default: 'pendiente' })
  estadoScoring!: EstadoScoring;

  @Column({ type: 'jsonb', nullable: true })
  score!: ScoreEntrevista | null;

  @Column({ type: 'jsonb', nullable: true })
  ajuste!: AjusteScore | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion!: Date;
}
