import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Hipotesis } from './hipotesis.entity';
import { estadoHipotesisSchema, tipoHipotesisSchema } from './hipotesis.types';

/**
 * Esquemas de respuesta de las hipótesis. Se derivan con Zod (única gramática de
 * esquemas del proyecto): sirven al tipo TypeScript (`z.infer`) y al DTO
 * (`createZodDto`) que Swagger publica como esquema OpenAPI. Reproducen el
 * recurso `Hipotesis` del contrato (`../contrato-api/openapi.yaml`).
 */

/** Recurso `Hipotesis`. `ideaId` es de solo lectura (derivado del path). */
export const hipotesisRespuestaSchema = z.object({
  id: z.uuid(),
  ideaId: z.uuid(),
  tipo: tipoHipotesisSchema,
  enunciado: z.string(),
  estado: estadoHipotesisSchema,
  fechaCreacion: z.iso.datetime(),
  fechaActualizacion: z.iso.datetime(),
});
export type HipotesisRespuesta = z.infer<typeof hipotesisRespuestaSchema>;
export class HipotesisRespuestaDto extends createZodDto(
  hipotesisRespuestaSchema,
) {}

/** Colección `HipotesisLista`: arreglo de `Hipotesis` (sin paginar). */
export const hipotesisListaSchema = z.array(hipotesisRespuestaSchema);
export class HipotesisListaDto extends createZodDto(hipotesisListaSchema) {}

/** Mapea la entidad `Hipotesis` al recurso del contrato. */
export function aHipotesisDto(hipotesis: Hipotesis): HipotesisRespuesta {
  return {
    id: hipotesis.id,
    ideaId: hipotesis.ideaId,
    tipo: hipotesis.tipo,
    enunciado: hipotesis.enunciado,
    estado: hipotesis.estado,
    fechaCreacion: hipotesis.fechaCreacion.toISOString(),
    fechaActualizacion: hipotesis.fechaActualizacion.toISOString(),
  };
}
