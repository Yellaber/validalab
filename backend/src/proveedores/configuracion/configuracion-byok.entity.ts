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
import type { ProveedorId } from '../catalogo/proveedor.types';

/**
 * Configuración BYOK de un usuario: su proveedor de IA, los dos modelos por
 * tarea y su API key CIFRADA en reposo (`api_key_cifrada`, nunca en claro,
 * nunca devuelta — RNF-07). Una por usuario (`owner_id` único, FK ON DELETE
 * CASCADE): el `PUT` la reemplaza (upsert).
 */
@Entity('configuraciones_byok')
export class ConfiguracionByok {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: Usuario;

  @Column({ type: 'varchar' })
  proveedor!: ProveedorId;

  @Column({ name: 'modelo_scoring', type: 'varchar' })
  modeloScoring!: string;

  @Column({ name: 'modelo_veredicto', type: 'varchar' })
  modeloVeredicto!: string;

  @Column({ name: 'api_key_cifrada', type: 'varchar' })
  apiKeyCifrada!: string;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion!: Date;
}
