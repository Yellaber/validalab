import { z } from 'zod';

/** Zona de semáforo de un KPI frente a sus umbrales (esquema `ZonaKpi`). */
export const zonaKpiSchema = z.enum(['go', 'observacion', 'kill', 'sin_datos']);
export type ZonaKpi = z.infer<typeof zonaKpiSchema>;

/**
 * Deriva la zona de semáforo de un KPI a partir de su valor y sus umbrales
 * vigentes: `sin_datos` si no hay valor (denominador cero / sin evidencia);
 * `kill` si hay `umbralKill` y el valor está por debajo; `go` si el valor alcanza
 * el `umbralGo`; `observacion` en el rango intermedio. Un KPI sin zona kill
 * (`umbralKill` nulo) solo alterna entre `go` y `observacion`.
 */
export function determinarZona(
  valor: number | null,
  umbralGo: number,
  umbralKill: number | null,
): ZonaKpi {
  if (valor === null) {
    return 'sin_datos';
  }
  if (umbralKill !== null && valor < umbralKill) {
    return 'kill';
  }
  if (valor >= umbralGo) {
    return 'go';
  }
  return 'observacion';
}
