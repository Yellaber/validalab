import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ProveedorId } from '../catalogo/proveedor.types';

/**
 * Tarifa de un modelo en la tabla de precios (RF-22e). Son DATOS configurables y
 * actualizables sin redesplegar (RNF-18), sembrados por migración con precios
 * reales aproximados; nunca cableados en código. Precios por millón de tokens.
 */
@Entity('precios_modelo')
export class PrecioModelo {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'varchar' })
  proveedor!: ProveedorId;

  @Column({ name: 'modelo_id', type: 'varchar' })
  modeloId!: string;

  @Column({ name: 'precio_entrada_por_millon', type: 'double precision' })
  precioEntradaPorMillon!: number;

  @Column({ name: 'precio_salida_por_millon', type: 'double precision' })
  precioSalidaPorMillon!: number;

  @Column({
    name: 'precio_entrada_cacheada_por_millon',
    type: 'double precision',
    nullable: true,
  })
  precioEntradaCacheadaPorMillon!: number | null;

  @Column({ type: 'varchar', default: 'USD' })
  moneda!: string;

  @Column({ name: 'vigente_desde', type: 'timestamptz' })
  vigenteDesde!: Date;
}
