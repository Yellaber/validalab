import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { aModeloDto } from './catalogo-respuesta';
import { ModeloIA } from './modelo-ia.entity';
import {
  PROVEEDORES,
  ProveedorIaDominio,
  ProveedorId,
} from './proveedor.types';

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(ModeloIA)
    private readonly modelos: Repository<ModeloIA>,
  ) {}

  /**
   * Devuelve el catálogo curado: un `ProveedorIA` por cada proveedor soportado
   * (orden de `PROVEEDORES`) con sus modelos (leídos de la BD, ordenados por
   * `orden`). Un proveedor sin modelos sembrados aparece con `modelos: []`.
   */
  async listar(): Promise<ProveedorIaDominio[]> {
    const modelos = await this.modelos.find({
      order: { proveedor: 'ASC', orden: 'ASC' },
    });
    return PROVEEDORES.map((proveedor) => ({
      id: proveedor.id,
      nombre: proveedor.nombre,
      modelos: modelos
        .filter((m) => m.proveedor === proveedor.id)
        .map(aModeloDto),
    }));
  }

  /**
   * Ids de modelo del catálogo de un proveedor. Lo usa la configuración BYOK
   * para validar que los modelos elegidos pertenezcan al proveedor.
   */
  async modeloIdsDe(proveedor: ProveedorId): Promise<string[]> {
    const modelos = await this.modelos.find({ where: { proveedor } });
    return modelos.map((m) => m.modeloId);
  }
}
