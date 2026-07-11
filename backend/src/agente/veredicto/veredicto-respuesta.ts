import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { esquemaPaginado } from '../../common/pagination/paginado.schema';
import { kpiCalculadoSchema } from '../../kpis/tablero/kpis-respuesta';
import { Veredicto } from './veredicto.entity';
import {
  estadoVeredictoSchema,
  justificacionKpiSchema,
  tipoVeredictoSchema,
  verificacionVeredictoSchema,
} from './veredicto.types';

/**
 * Esquema de respuesta del recurso `Veredicto` del contrato. El bloque del agente
 * y el snapshot son de solo lectura; `verificacion` es `null` mientras está
 * `pendiente`.
 */
export const veredictoRespuestaSchema = z.object({
  id: z.uuid(),
  ideaId: z.uuid(),
  veredicto: tipoVeredictoSchema,
  confianza: z.number().min(0).max(100),
  justificacionPorKPI: z.array(justificacionKpiSchema),
  recomendaciones: z.array(z.string()),
  proveedor: z.string(),
  modelo: z.string(),
  snapshotKpis: z.array(kpiCalculadoSchema),
  estadoVerificacion: estadoVeredictoSchema,
  verificacion: verificacionVeredictoSchema.nullable(),
  fechaEmision: z.iso.datetime(),
});
export type VeredictoRespuesta = z.infer<typeof veredictoRespuestaSchema>;
export class VeredictoRespuestaDto extends createZodDto(
  veredictoRespuestaSchema,
) {}

/** Página de veredictos (esquema `VeredictosPaginados`). */
export const veredictosPaginadosSchema = esquemaPaginado(
  veredictoRespuestaSchema,
);
export class VeredictosPaginadosDto extends createZodDto(
  veredictosPaginadosSchema,
) {}

/** Mapea la entidad `Veredicto` al recurso del contrato. */
export function aVeredictoDto(v: Veredicto): VeredictoRespuesta {
  return {
    id: v.id,
    ideaId: v.ideaId,
    veredicto: v.veredicto,
    confianza: v.confianza,
    justificacionPorKPI: v.justificacionPorKPI,
    recomendaciones: v.recomendaciones,
    proveedor: v.proveedor,
    modelo: v.modelo,
    snapshotKpis: v.snapshotKpis,
    estadoVerificacion: v.estadoVerificacion,
    verificacion: v.verificacion,
    fechaEmision: v.fechaEmision.toISOString(),
  };
}
