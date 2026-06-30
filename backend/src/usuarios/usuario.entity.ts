import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import type { EstadoUsuario, Rol } from './usuario.types';

/**
 * Cuenta de usuario. El `passwordHash` NUNCA se serializa hacia el cliente: el
 * mapeo a la respuesta `Usuario` del contrato lo excluye explícitamente.
 * El `email` se normaliza a minúsculas en la aplicación antes de persistir/buscar.
 */
@Entity('usuarios')
export class Usuario {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar' })
  nombre!: string;

  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash!: string;

  @Column({ type: 'varchar', default: 'validador' })
  rol!: Rol;

  @Column({ type: 'varchar', default: 'activo' })
  estado!: EstadoUsuario;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;
}
