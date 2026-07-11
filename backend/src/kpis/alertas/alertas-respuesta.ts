import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { kpiSchema } from '../../ideas/umbral/kpi.catalog';
import { AlertaKpi } from './alerta-kpi.entity';

/** Tipo de cruce de umbral (`TipoAlerta`). */
export const tipoAlertaSchema = z.enum(['go', 'kill']);

/** Recurso `AlertaKpi` del contrato. `fecha` mapea `fecha_creacion` de la entidad. */
export const alertaKpiRespuestaSchema = z.object({
  id: z.uuid(),
  ideaId: z.uuid(),
  kpi: kpiSchema,
  tipo: tipoAlertaSchema,
  valor: z.number(),
  umbral: z.number(),
  fecha: z.iso.datetime(),
  leida: z.boolean(),
});
export type AlertaKpiRespuesta = z.infer<typeof alertaKpiRespuestaSchema>;
export class AlertaKpiRespuestaDto extends createZodDto(
  alertaKpiRespuestaSchema,
) {}

/** Página de alertas (esquema `AlertasPaginadas`). */
export const alertasPaginadasSchema = z.object({
  datos: z.array(alertaKpiRespuestaSchema),
  paginacion: z.object({
    pagina: z.number().int(),
    porPagina: z.number().int(),
    total: z.number().int(),
    totalPaginas: z.number().int(),
  }),
});
export class AlertasPaginadasDto extends createZodDto(alertasPaginadasSchema) {}

/** Mapea la entidad `AlertaKpi` al recurso del contrato. */
export function aAlertaDto(alerta: AlertaKpi): AlertaKpiRespuesta {
  return {
    id: alerta.id,
    ideaId: alerta.ideaId,
    kpi: alerta.kpi,
    tipo: alerta.tipo,
    valor: alerta.valor,
    umbral: alerta.umbral,
    fecha: alerta.fechaCreacion.toISOString(),
    leida: alerta.leida,
  };
}
