import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginacionQuerySchema } from '../common/pagination/paginacion.dto';
import {
  canalContactoSchema,
  estadoOutreachSchema,
  origenContactoSchema,
} from './contacto.types';

/**
 * DTOs de entrada del módulo contactos. Validados por el `ZodValidationPipe`
 * global. El `ideaId`, el `estado` y las fechas de toque NUNCA se aceptan como
 * entrada: se derivan del path o se cambian con acciones dedicadas.
 */

export const crearContactoSchema = z.object({
  nombre: z.string().min(1),
  perfil: z.string().optional(),
  enlace: z.string().optional(),
  canal: canalContactoSchema.optional(),
  origen: origenContactoSchema.optional(),
  referidoPorId: z.uuid().nullable().optional(),
});
export class CrearContactoDto extends createZodDto(crearContactoSchema) {}

/** Edición parcial de contenido (PATCH). Sin `estado` ni fechas de toque. */
export const actualizarContactoSchema = z.object({
  nombre: z.string().min(1).optional(),
  perfil: z.string().optional(),
  enlace: z.string().optional(),
  canal: canalContactoSchema.optional(),
  origen: origenContactoSchema.optional(),
  referidoPorId: z.uuid().nullable().optional(),
  notas: z.string().optional(),
});
export class ActualizarContactoDto extends createZodDto(
  actualizarContactoSchema,
) {}

/** Cuerpo de la transición del embudo: el `estado` destino. */
export const transicionEstadoSchema = z.object({
  estado: estadoOutreachSchema,
});
export class TransicionEstadoDto extends createZodDto(transicionEstadoSchema) {}

/** Cuerpo del toque: `fecha` opcional (por defecto, el momento del registro). */
export const registrarToqueSchema = z.object({
  fecha: z.iso.datetime().optional(),
});
export class RegistrarToqueDto extends createZodDto(registrarToqueSchema) {}

/** Parámetros de ruta de un contacto concreto (idea + contacto, uuid). */
export const idContactoParamSchema = z.object({
  id: z.uuid(),
  idContacto: z.uuid(),
});
export class IdContactoParamDto extends createZodDto(idContactoParamSchema) {}

/** Query del listado: paginación + filtro opcional por estado del embudo. */
export const listarContactosQuerySchema = paginacionQuerySchema.extend({
  estado: estadoOutreachSchema.optional(),
});
export type ListarContactosQuery = z.infer<typeof listarContactosQuerySchema>;
export class ListarContactosQueryDto extends createZodDto(
  listarContactosQuerySchema,
) {}
