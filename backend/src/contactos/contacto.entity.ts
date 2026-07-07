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
import { Idea } from '../ideas/idea/idea.entity';
import type {
  CanalContacto,
  EstadoOutreach,
  OrigenContacto,
} from './contacto.types';

/**
 * Persona candidata a entrevista dentro del CRM de una idea. Información
 * personal: cuelga de la idea (`idea_id`, FK ON DELETE CASCADE) y hereda de ella
 * el aislamiento por usuario. Nace en estado `por_contactar`. `referidoPorId`
 * apunta a otro contacto de la misma idea (auto-FK ON DELETE SET NULL); las
 * fechas de toque se registran con la acción de toque (máx. dos).
 */
@Entity('contactos')
export class Contacto {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ name: 'idea_id', type: 'uuid' })
  ideaId!: string;

  @ManyToOne(() => Idea, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idea_id' })
  idea!: Idea;

  @Column({ type: 'varchar' })
  nombre!: string;

  @Column({ type: 'varchar', nullable: true })
  perfil?: string | null;

  @Column({ type: 'varchar', nullable: true })
  enlace?: string | null;

  @Column({ type: 'varchar' })
  canal!: CanalContacto;

  @Column({ type: 'varchar' })
  origen!: OrigenContacto;

  @Column({ name: 'referido_por_id', type: 'uuid', nullable: true })
  referidoPorId!: string | null;

  @ManyToOne(() => Contacto, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'referido_por_id' })
  referidoPor?: Contacto | null;

  @Column({ type: 'varchar', default: 'por_contactar' })
  estado!: EstadoOutreach;

  @Column({ name: 'primer_toque_en', type: 'timestamptz', nullable: true })
  primerToqueEn!: Date | null;

  @Column({ name: 'segundo_toque_en', type: 'timestamptz', nullable: true })
  segundoToqueEn!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  notas?: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion!: Date;
}
