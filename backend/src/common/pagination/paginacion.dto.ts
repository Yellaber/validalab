import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Parámetros de paginación de toda colección, con la semántica del contrato:
 * `pagina` ≥ 1 (por defecto 1) y `porPagina` entre 1 y 100 (por defecto 20).
 * Los valores llegan como string en la query, así que se coercionan a número;
 * fuera de rango → falla de validación (`VALIDACION_FALLIDA`).
 */
export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginacionQuery = z.infer<typeof paginacionQuerySchema>;

/** DTO de query reutilizable por cualquier endpoint de colección. */
export class PaginacionQueryDto extends createZodDto(paginacionQuerySchema) {}
