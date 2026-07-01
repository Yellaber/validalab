import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

/**
 * Sesión de refresh token. Guarda solo el HASH del refresh token opaco (nunca
 * el valor en claro). La rotación revoca la sesión actual y crea una nueva; el
 * logout la revoca. `revocadoEn` nulo = vigente (si no ha expirado).
 */
@Entity('sesiones')
export class Sesion {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId!: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @Index({ unique: true })
  @Column({ name: 'token_hash', type: 'varchar' })
  tokenHash!: string;

  @Column({ name: 'expira_en', type: 'timestamptz' })
  expiraEn!: Date;

  @Column({ name: 'revocado_en', type: 'timestamptz', nullable: true })
  revocadoEn!: Date | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;
}
