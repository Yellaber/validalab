import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Idea } from './idea.entity';
import { estadoIdeaSchema } from './idea.types';

/**
 * Esquemas de respuesta del módulo ideas. Se derivan con Zod (única gramática de
 * esquemas del proyecto) para servir desde una sola fuente al tipo TypeScript
 * (`z.infer`) que usan servicio y controlador y al DTO (`createZodDto`) que
 * `@nestjs/swagger` publica como esquema OpenAPI. La forma reproduce el recurso
 * `Idea` del contrato (`../contrato-api/openapi.yaml`).
 */

/** Recurso `Idea` del contrato. `ownerId` es de solo lectura (derivado del token). */
export const ideaRespuestaSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  titulo: z.string(),
  descripcion: z.string().optional(),
  problema: z.string(),
  segmentoBeachhead: z.string().optional(),
  estado: estadoIdeaSchema,
  fechaCreacion: z.iso.datetime(),
  fechaActualizacion: z.iso.datetime(),
});
export type IdeaRespuesta = z.infer<typeof ideaRespuestaSchema>;
export class IdeaRespuestaDto extends createZodDto(ideaRespuestaSchema) {}

/** Página de ideas (esquema `IdeasPaginadas`: sobre `RespuestaPaginada` de `Idea`). */
export const ideasPaginadasSchema = z.object({
  datos: z.array(ideaRespuestaSchema),
  paginacion: z.object({
    pagina: z.number().int(),
    porPagina: z.number().int(),
    total: z.number().int(),
    totalPaginas: z.number().int(),
  }),
});
export class IdeasPaginadasDto extends createZodDto(ideasPaginadasSchema) {}

/**
 * Mapea la entidad `Idea` al recurso del contrato. Los campos opcionales que la
 * base guarda como `null` se serializan como ausentes (`undefined`), no `null`.
 */
export function aIdeaDto(idea: Idea): IdeaRespuesta {
  return {
    id: idea.id,
    ownerId: idea.ownerId,
    titulo: idea.titulo,
    descripcion: idea.descripcion ?? undefined,
    problema: idea.problema,
    segmentoBeachhead: idea.segmentoBeachhead ?? undefined,
    estado: idea.estado,
    fechaCreacion: idea.fechaCreacion.toISOString(),
    fechaActualizacion: idea.fechaActualizacion.toISOString(),
  };
}
