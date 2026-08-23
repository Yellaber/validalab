import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { proveedorIdSchema } from '../catalogo/proveedor.types';
import { monedaSchema } from '../precios/precios-respuesta';

/** Tarea del agente que consumió IA, en el desglose de costo. */
export const tareaCostoSchema = z.enum(['scoring', 'veredicto']);

/** Costo estimado de una idea desglosado por tarea del agente (`DesgloseCostoTarea`). */
export const desgloseCostoTareaSchema = z.object({
  tarea: tareaCostoSchema,
  llamadas: z.number().int().min(0),
  tokensEntrada: z.number().int().min(0),
  tokensSalida: z.number().int().min(0),
  costoEstimado: z.number().min(0),
});
export type DesgloseCostoTarea = z.infer<typeof desgloseCostoTareaSchema>;

/** Recurso `CostoIdea` del contrato. */
export const costoIdeaSchema = z.object({
  ideaId: z.uuid(),
  proveedor: proveedorIdSchema.nullable(),
  moneda: monedaSchema,
  costoEstimadoTotal: z.number().min(0),
  desglosePorTarea: z.array(desgloseCostoTareaSchema),
  tokensEntrada: z.number().int().min(0),
  tokensSalida: z.number().int().min(0),
  llamadas: z.number().int().min(0),
  esEstimado: z.boolean(),
  aclaracion: z.string(),
  urlFacturacion: z.url().nullable(),
  fechaCalculo: z.iso.datetime(),
});
export type CostoIdea = z.infer<typeof costoIdeaSchema>;
export class CostoIdeaDto extends createZodDto(costoIdeaSchema) {}

/** Costo estimado de una idea, para el desglose del total del usuario (`CostoIdeaResumen`). */
export const costoIdeaResumenSchema = z.object({
  ideaId: z.uuid(),
  titulo: z.string(),
  costoEstimado: z.number().min(0),
});
export type CostoIdeaResumen = z.infer<typeof costoIdeaResumenSchema>;

/** Recurso `CostoUsuario` del contrato. */
export const costoUsuarioSchema = z.object({
  moneda: monedaSchema,
  costoEstimadoTotal: z.number().min(0),
  costoPorIdea: z.array(costoIdeaResumenSchema),
  proveedor: proveedorIdSchema.nullable(),
  tokensEntrada: z.number().int().min(0),
  tokensSalida: z.number().int().min(0),
  esEstimado: z.boolean(),
  aclaracion: z.string(),
  urlFacturacion: z.url().nullable(),
  fechaCalculo: z.iso.datetime(),
});
export type CostoUsuario = z.infer<typeof costoUsuarioSchema>;
export class CostoUsuarioDto extends createZodDto(costoUsuarioSchema) {}
