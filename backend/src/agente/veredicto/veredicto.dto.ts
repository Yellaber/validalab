import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginacionQuerySchema } from '../../common/pagination/paginacion.dto';

/**
 * Cuerpo de la verificación (`VerificarVeredictoRequest`). `aprobado` hace firme
 * el veredicto y cambia el estado de la idea; `anulado` exige `nota`. La regla
 * "nota obligatoria al anular" se valida en el servicio (depende de `resultado`).
 */
export const verificarVeredictoSchema = z.object({
  resultado: z.enum(['aprobado', 'anulado']),
  nota: z.string().min(1).optional(),
});
export class VerificarVeredictoDto extends createZodDto(
  verificarVeredictoSchema,
) {}

/** Query del historial de veredictos: solo paginación. */
export const listarVeredictosQuerySchema = paginacionQuerySchema;
export type ListarVeredictosQuery = z.infer<typeof listarVeredictosQuerySchema>;
export class ListarVeredictosQueryDto extends createZodDto(
  listarVeredictosQuerySchema,
) {}

/** Parámetros de ruta de un veredicto concreto (idea + veredicto, uuid). */
export const idVeredictoParamSchema = z.object({
  id: z.uuid(),
  idVeredicto: z.uuid(),
});
export class IdVeredictoParamDto extends createZodDto(idVeredictoParamSchema) {}
