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
import { Idea } from '../idea/idea.entity';
import type { EstadoHipotesis, TipoHipotesis } from './hipotesis.types';

/**
 * Hipótesis tipificada de una idea: afirmación falsable sobre el problema, el
 * mercado o el pago. Cuelga de una `Idea` (`idea_id`, FK ON DELETE CASCADE) y
 * hereda de ella el aislamiento por usuario. Nace en estado `pendiente`.
 */
@Entity('hipotesis')
export class Hipotesis {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ name: 'idea_id', type: 'uuid' })
  ideaId!: string;

  @ManyToOne(() => Idea, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idea_id' })
  idea!: Idea;

  @Column({ type: 'varchar' })
  tipo!: TipoHipotesis;

  @Column({ type: 'varchar' })
  enunciado!: string;

  @Column({ type: 'varchar', default: 'pendiente' })
  estado!: EstadoHipotesis;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion!: Date;
}
