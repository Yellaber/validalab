import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Cuerpo de `PUT /ideas/{id}/umbrales/{kpi}`. `umbralGo` es requerido;
 * `umbralKill` es opcional/`null` (los KPIs sin zona kill lo omiten). La regla
 * `umbralKill ≤ umbralGo` se valida en el servicio (422 si no se cumple), no
 * aquí, porque cruza dos campos con semántica de dominio.
 */
export const actualizarUmbralSchema = z.object({
  umbralGo: z.number(),
  umbralKill: z.number().nullable().optional(),
});
export class ActualizarUmbralDto extends createZodDto(actualizarUmbralSchema) {}

/**
 * Parámetros de ruta de la fijación de umbral: la idea (`id`, uuid) y el `kpi`.
 * El `kpi` se valida como STRING (no como enum): un valor fuera del catálogo
 * debe responder `404 RECURSO_NO_ENCONTRADO` (regla del contrato), no un `422`
 * de validación. La pertenencia al catálogo la comprueba el servicio.
 */
export const idKpiParamSchema = z.object({
  id: z.uuid(),
  kpi: z.string().min(1),
});
export class IdKpiParamDto extends createZodDto(idKpiParamSchema) {}
