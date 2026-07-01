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
import { Usuario } from '../../usuarios/usuario.entity';
import type { EstadoIdea } from './idea.types';

/**
 * Idea de software en validación. Entidad raíz del dominio (junto a `Usuario`);
 * todo lo demás cuelga de ella. Queda aislada por usuario: `owner_id` se deriva
 * SIEMPRE del token y cada consulta del repositorio filtra por él. Nace en
 * estado `borrador`; `descripcion` y `segmentoBeachhead` son opcionales.
 */
@Entity('ideas')
export class Idea {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: Usuario;

  @Column({ type: 'varchar' })
  titulo!: string;

  @Column({ type: 'varchar', nullable: true })
  descripcion?: string | null;

  @Column({ type: 'varchar' })
  problema!: string;

  @Column({ name: 'segmento_beachhead', type: 'varchar', nullable: true })
  segmentoBeachhead?: string | null;

  @Column({ type: 'varchar', default: 'borrador' })
  estado!: EstadoIdea;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion!: Date;
}
