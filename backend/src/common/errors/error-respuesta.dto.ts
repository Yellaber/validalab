import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CodigoError } from './codigo-error';

/**
 * Esquema del sobre `Error` del contrato para la documentación OpenAPI (Swagger).
 * Solo describe la forma de respuesta; el filtro global `FiltroDeExcepciones`
 * sigue siendo quien construye estos sobres en tiempo de ejecución.
 */
export const errorRespuestaSchema = z.object({
  codigo: z.enum(CodigoError),
  mensaje: z.string(),
  detalles: z
    .array(z.object({ campo: z.string(), problema: z.string() }))
    .optional(),
});
export class ErrorRespuestaDto extends createZodDto(errorRespuestaSchema) {}
