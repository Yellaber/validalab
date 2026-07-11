import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import type { Kpi } from '../../ideas/umbral/kpi.catalog';

/** Tipo de cruce de umbral que disparó la alerta (`TipoAlerta`). */
export type TipoAlerta = 'go' | 'kill';

/**
 * Alerta generada por el sistema cuando un KPI de una idea cruza su umbral kill
 * o go (RF-13). No se crea desde el cliente: la emite `AlertasService` al
 * reevaluar el tablero tras un scoring. Cuelga de la idea por `idea_id` (hereda
 * su aislamiento); sin FK, como el resto de la evidencia histórica del dominio.
 */
@Entity('alertas')
export class AlertaKpi {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ name: 'idea_id', type: 'uuid' })
  ideaId!: string;

  @Column({ type: 'varchar' })
  kpi!: Kpi;

  @Column({ type: 'varchar' })
  tipo!: TipoAlerta;

  @Column({ type: 'double precision' })
  valor!: number;

  @Column({ type: 'double precision' })
  umbral!: number;

  @Column({ type: 'boolean', default: false })
  leida!: boolean;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;
}
