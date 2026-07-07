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
import { Usuario } from '../../usuarios/usuario/usuario.entity';
import type { Pregunta } from './guion.types';

/**
 * Guión de entrevista reutilizable entre ideas, propiedad del usuario
 * (`owner_id`, FK ON DELETE CASCADE). Las `preguntas` son value-objects
 * ordenados embebidos como jsonb: no tienen identidad ni ciclo de vida propios y
 * siempre se leen/escriben con el guión (el PATCH reemplaza el conjunto).
 */
@Entity('guiones')
export class Guion {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: Usuario;

  @Column({ type: 'varchar' })
  nombre!: string;

  @Column({ type: 'varchar', nullable: true })
  descripcion?: string | null;

  @Column({ type: 'jsonb' })
  preguntas!: Pregunta[];

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion!: Date;
}
