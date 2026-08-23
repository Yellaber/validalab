import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginacionQuerySchema } from '../../common/pagination/paginacion.dto';
import { estadoIdeaSchema } from './idea.types';

/**
 * DTOs de entrada del módulo ideas. Validados por el `ZodValidationPipe` global
 * de la fundación. Los límites reflejan el contrato (`titulo`/`problema` ≥ 1).
 * El `ownerId` NUNCA se acepta como entrada: se deriva del token en el servicio.
 */

export const crearIdeaSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  problema: z.string().min(1),
  segmentoBeachhead: z.string().optional(),
});
export class CrearIdeaDto extends createZodDto(crearIdeaSchema) {}

/**
 * Edición parcial del contenido de una idea (PATCH): todos los campos opcionales.
 * NO admite `estado` ni `ownerId`: las transiciones a `go`/`pivote`/`kill`
 * provienen del veredicto aprobado (E6), nunca de la edición.
 */
export const actualizarIdeaSchema = z.object({
  titulo: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  problema: z.string().min(1).optional(),
  segmentoBeachhead: z.string().optional(),
});
export class ActualizarIdeaDto extends createZodDto(actualizarIdeaSchema) {}

/** `id` de la idea objetivo, por la ruta; formato uuid → VALIDACION_FALLIDA si no. */
export const idIdeaParamSchema = z.object({
  id: z.uuid(),
});
export class IdIdeaParamDto extends createZodDto(idIdeaParamSchema) {}

/**
 * Query del listado: paginación de la fundación (`pagina`/`porPagina`) más un
 * filtro opcional por `estado`; un `estado` fuera del catálogo → VALIDACION_FALLIDA.
 */
export const listarIdeasQuerySchema = paginacionQuerySchema.extend({
  estado: estadoIdeaSchema.optional(),
});
export type ListarIdeasQuery = z.infer<typeof listarIdeasQuerySchema>;
export class ListarIdeasQueryDto extends createZodDto(listarIdeasQuerySchema) {}
