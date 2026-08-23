import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { ProveedorId } from './proveedor.types';

/**
 * Modelo idóneo para el análisis dentro de un proveedor. Es DATO del catálogo
 * curado: se siembra por migración y administración lo ajusta con un UPDATE, sin
 * redesplegar (RNF-18). `modelo_id` es el identificador del modelo en el
 * proveedor (cadena, p. ej. `claude-opus-4-8`); `orden` ordena dentro del proveedor.
 */
@Entity('modelos_ia')
export class ModeloIA {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  proveedor!: ProveedorId;

  @Column({ name: 'modelo_id', type: 'varchar' })
  modeloId!: string;

  @Column({ type: 'varchar' })
  nombre!: string;

  @Column({ type: 'varchar', nullable: true })
  descripcion?: string | null;

  @Column({ type: 'int', default: 0 })
  orden!: number;
}
