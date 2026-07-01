import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Idea } from './idea.entity';
import type { Kpi } from './kpi.catalog';

/**
 * Override de umbral kill/go de un KPI para una idea. La BD guarda SOLO los
 * umbrales editados por el usuario; los valores por defecto (y el grupo/unidad)
 * viven en el catálogo en código (`CATALOGO_KPI`). Unicidad por `(idea_id, kpi)`:
 * cada KPI tiene a lo sumo un override por idea (el `PUT` es un upsert idempotente).
 */
@Entity('umbrales')
@Unique(['ideaId', 'kpi'])
export class UmbralIdea {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ name: 'idea_id', type: 'uuid' })
  ideaId!: string;

  @ManyToOne(() => Idea, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idea_id' })
  idea!: Idea;

  @Column({ type: 'varchar' })
  kpi!: Kpi;

  @Column({ name: 'umbral_go', type: 'double precision' })
  umbralGo!: number;

  @Column({ name: 'umbral_kill', type: 'double precision', nullable: true })
  umbralKill!: number | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion!: Date;
}
