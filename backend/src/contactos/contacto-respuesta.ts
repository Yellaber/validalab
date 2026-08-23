import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { esquemaPaginado } from '../common/pagination/paginado.schema';
import { Contacto } from './contacto.entity';
import {
  canalContactoSchema,
  estadoOutreachSchema,
  origenContactoSchema,
} from './contacto.types';

/**
 * Esquemas de respuesta del módulo contactos. Reproducen el recurso `Contacto`
 * del contrato. Los campos `nullable` del contrato (`referidoPorId`,
 * `primerToqueEn`, `segundoToqueEn`) conservan `null`; los opcionales sin
 * `nullable` (`perfil`, `enlace`, `notas`) se sirven ausentes cuando la base los
 * guarda como `null`.
 */
export const contactoRespuestaSchema = z.object({
  id: z.uuid(),
  ideaId: z.uuid(),
  nombre: z.string(),
  perfil: z.string().optional(),
  enlace: z.string().optional(),
  canal: canalContactoSchema,
  origen: origenContactoSchema,
  referidoPorId: z.uuid().nullable(),
  estado: estadoOutreachSchema,
  primerToqueEn: z.iso.datetime().nullable(),
  segundoToqueEn: z.iso.datetime().nullable(),
  notas: z.string().optional(),
  fechaCreacion: z.iso.datetime(),
  fechaActualizacion: z.iso.datetime(),
});
export type ContactoRespuesta = z.infer<typeof contactoRespuestaSchema>;
export class ContactoRespuestaDto extends createZodDto(
  contactoRespuestaSchema,
) {}

/** Página de contactos (esquema `ContactosPaginados`). */
export const contactosPaginadosSchema = esquemaPaginado(
  contactoRespuestaSchema,
);
export class ContactosPaginadosDto extends createZodDto(
  contactosPaginadosSchema,
) {}

/** Mapea la entidad `Contacto` al recurso del contrato. */
export function aContactoDto(contacto: Contacto): ContactoRespuesta {
  return {
    id: contacto.id,
    ideaId: contacto.ideaId,
    nombre: contacto.nombre,
    perfil: contacto.perfil ?? undefined,
    enlace: contacto.enlace ?? undefined,
    canal: contacto.canal,
    origen: contacto.origen,
    referidoPorId: contacto.referidoPorId,
    estado: contacto.estado,
    primerToqueEn: contacto.primerToqueEn
      ? contacto.primerToqueEn.toISOString()
      : null,
    segundoToqueEn: contacto.segundoToqueEn
      ? contacto.segundoToqueEn.toISOString()
      : null,
    notas: contacto.notas ?? undefined,
    fechaCreacion: contacto.fechaCreacion.toISOString(),
    fechaActualizacion: contacto.fechaActualizacion.toISOString(),
  };
}
