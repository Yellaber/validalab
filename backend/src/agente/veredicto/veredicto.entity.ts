import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import type { KpiCalculado } from '../../kpis/tablero/kpis-respuesta';
import type {
  EstadoVeredicto,
  JustificacionKpi,
  TipoVeredicto,
  VerificacionVeredicto,
} from './veredicto.types';

/**
 * Veredicto razonado del Validador Inteligente sobre una idea (RF-14/15/16). El
 * bloque del agente (`veredicto`, `confianza`, `justificacionPorKpi`,
 * `recomendaciones`) y el `snapshotKpis`/`proveedor`/`modelo` son de solo lectura
 * y quedan CONGELADOS al emitir (reproducibilidad, RNF-09). La verificación
 * humana se añade aparte (modo consultivo): al aprobar cambia el estado de la
 * idea; ambas versiones se conservan. Cuelga de la idea por `idea_id`, sin FK.
 */
@Entity('veredictos')
export class Veredicto {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ name: 'idea_id', type: 'uuid' })
  ideaId!: string;

  @Column({ type: 'varchar' })
  veredicto!: TipoVeredicto;

  @Column({ type: 'int' })
  confianza!: number;

  @Column({ name: 'justificacion_por_kpi', type: 'jsonb' })
  justificacionPorKPI!: JustificacionKpi[];

  @Column({ type: 'jsonb' })
  recomendaciones!: string[];

  @Column({ type: 'varchar' })
  proveedor!: string;

  @Column({ type: 'varchar' })
  modelo!: string;

  @Column({ name: 'snapshot_kpis', type: 'jsonb' })
  snapshotKpis!: KpiCalculado[];

  @Column({
    name: 'estado_verificacion',
    type: 'varchar',
    default: 'pendiente',
  })
  estadoVerificacion!: EstadoVeredicto;

  @Column({ type: 'jsonb', nullable: true })
  verificacion!: VerificacionVeredicto | null;

  @CreateDateColumn({ name: 'fecha_emision', type: 'timestamptz' })
  fechaEmision!: Date;
}
