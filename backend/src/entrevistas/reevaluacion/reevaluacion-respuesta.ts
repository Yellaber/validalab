import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { monedaSchema } from '../../proveedores/precios/precios-respuesta';

/** Estimación de costo de una re-evaluación en lote, calculada SIN ejecutar (`EstimacionReevaluacion`). */
export const estimacionReevaluacionSchema = z.object({
  entrevistasAfectadas: z.number().int().min(0),
  modeloScoring: z.string().nullable(),
  moneda: monedaSchema,
  costoEstimado: z.number().min(0),
  tokensEntradaEstimados: z.number().int().min(0),
  tokensSalidaEstimados: z.number().int().min(0),
  esEstimado: z.boolean(),
  aclaracion: z.string(),
});
export type EstimacionReevaluacion = z.infer<
  typeof estimacionReevaluacionSchema
>;
export class EstimacionReevaluacionDto extends createZodDto(
  estimacionReevaluacionSchema,
) {}

/** Resultado de ejecutar una re-evaluación en lote (`ResultadoReevaluacion`). */
export const resultadoReevaluacionSchema = z.object({
  entrevistasReevaluadas: z.number().int().min(0),
  entrevistasOmitidas: z.number().int().min(0),
  moneda: monedaSchema,
  costoEstimado: z.number().min(0),
  tokensEntrada: z.number().int().min(0),
  tokensSalida: z.number().int().min(0),
});
export type ResultadoReevaluacion = z.infer<typeof resultadoReevaluacionSchema>;
export class ResultadoReevaluacionDto extends createZodDto(
  resultadoReevaluacionSchema,
) {}
