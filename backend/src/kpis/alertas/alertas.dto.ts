import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginacionQuerySchema } from '../../common/pagination/paginacion.dto';

/** Cuerpo del marcado de una alerta (`ActualizarAlertaRequest`): solo `leida`. */
export const actualizarAlertaSchema = z.object({
  leida: z.boolean(),
});
export class ActualizarAlertaDto extends createZodDto(actualizarAlertaSchema) {}

/** Query del listado: paginación + filtro opcional por `leida`. */
export const listarAlertasQuerySchema = paginacionQuerySchema.extend({
  leida: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});
export type ListarAlertasQuery = z.infer<typeof listarAlertasQuerySchema>;
export class ListarAlertasQueryDto extends createZodDto(
  listarAlertasQuerySchema,
) {}

/** Parámetros de ruta de una alerta concreta (idea + alerta, uuid). */
export const idAlertaParamSchema = z.object({
  id: z.uuid(),
  idAlerta: z.uuid(),
});
export class IdAlertaParamDto extends createZodDto(idAlertaParamSchema) {}
