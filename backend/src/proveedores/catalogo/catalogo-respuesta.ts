import { createZodDto } from 'nestjs-zod';
import { ModeloIA } from './modelo-ia.entity';
import { proveedorIaSchema, ProveedorIaDominio } from './proveedor.types';

/** DTO de respuesta del catálogo: un `ProveedorIA` (publicado en Swagger). */
export class ProveedorIaDto extends createZodDto(proveedorIaSchema) {}

/** Mapea una fila `ModeloIA` (entidad) al `ModeloIA` del contrato. */
export function aModeloDto(
  modelo: ModeloIA,
): ProveedorIaDominio['modelos'][number] {
  return {
    id: modelo.modeloId,
    nombre: modelo.nombre,
    descripcion: modelo.descripcion ?? undefined,
  };
}
