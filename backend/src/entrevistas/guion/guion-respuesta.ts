import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { esquemaPaginado } from '../../common/pagination/paginado.schema';
import { Guion } from './guion.entity';
import { preguntaSchema } from './guion.types';

/**
 * Esquemas de respuesta del guión. Reproducen el recurso `Guion` del contrato.
 * `ownerId` es de solo lectura (derivado del token). Las preguntas se sirven
 * ordenadas por `orden`.
 */
export const guionRespuestaSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  nombre: z.string(),
  descripcion: z.string().optional(),
  preguntas: z.array(preguntaSchema),
  fechaCreacion: z.iso.datetime(),
  fechaActualizacion: z.iso.datetime(),
});
export type GuionRespuesta = z.infer<typeof guionRespuestaSchema>;
export class GuionRespuestaDto extends createZodDto(guionRespuestaSchema) {}

/** Página de guiones (esquema `GuionesPaginados`). */
export const guionesPaginadosSchema = esquemaPaginado(guionRespuestaSchema);
export class GuionesPaginadosDto extends createZodDto(guionesPaginadosSchema) {}

/** Mapea la entidad `Guion` al recurso del contrato (preguntas ordenadas). */
export function aGuionDto(guion: Guion): GuionRespuesta {
  return {
    id: guion.id,
    ownerId: guion.ownerId,
    nombre: guion.nombre,
    descripcion: guion.descripcion ?? undefined,
    preguntas: [...guion.preguntas].sort((a, b) => a.orden - b.orden),
    fechaCreacion: guion.fechaCreacion.toISOString(),
    fechaActualizacion: guion.fechaActualizacion.toISOString(),
  };
}
