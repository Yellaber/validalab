import { z } from 'zod';

/** Canal por el que se contacta a la persona (esquema `CanalContacto`). */
export const canalContactoSchema = z.enum([
  'linkedin',
  'correo',
  'mensajeria',
  'otro',
]);
export type CanalContacto = z.infer<typeof canalContactoSchema>;

/** De dónde proviene el contacto (esquema `OrigenContacto`). */
export const origenContactoSchema = z.enum([
  'busqueda_directa',
  'referido',
  'comunidad',
  'evento',
  'otro',
]);
export type OrigenContacto = z.infer<typeof origenContactoSchema>;

/**
 * Estado del contacto en el embudo de outreach (esquema `EstadoOutreach`).
 * Orden: `por_contactar → contactado → respondio → agendado → entrevistado →
 * descartado`. `entrevistado` solo se asigna al registrar una entrevista (E4).
 */
export const estadoOutreachSchema = z.enum([
  'por_contactar',
  'contactado',
  'respondio',
  'agendado',
  'entrevistado',
  'descartado',
]);
export type EstadoOutreach = z.infer<typeof estadoOutreachSchema>;
