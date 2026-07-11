import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Cuerpo de la re-evaluación en lote (`ReevaluacionLoteRequest`). `idsEntrevistas`
 * es opcional: por defecto se re-evalúan todas las entrevistas afectadas de la
 * idea; un subconjunto va explícito.
 */
export const reevaluacionLoteSchema = z.object({
  idsEntrevistas: z.array(z.uuid()).optional(),
});
export class ReevaluacionLoteDto extends createZodDto(reevaluacionLoteSchema) {}
