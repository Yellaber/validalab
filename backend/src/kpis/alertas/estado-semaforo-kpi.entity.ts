import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Kpi } from '../../ideas/umbral/kpi.catalog';
import type { ZonaKpi } from '../zona-kpi';

/**
 * Última zona de semáforo conocida de un KPI de una idea. Es el estado que
 * permite detectar un CRUCE: al reevaluar el tablero se compara la zona nueva
 * contra la guardada aquí, y solo se alerta cuando cambia hacia `go`/`kill`.
 * Único por `(idea_id, kpi)`; se actualiza en cada evaluación.
 */
@Entity('estado_semaforo_kpi')
@Index(['ideaId', 'kpi'], { unique: true })
export class EstadoSemaforoKpi {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ name: 'idea_id', type: 'uuid' })
  ideaId!: string;

  @Column({ type: 'varchar' })
  kpi!: Kpi;

  @Column({ type: 'varchar' })
  zona!: ZonaKpi;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion!: Date;
}
