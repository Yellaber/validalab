import { z } from 'zod';

/**
 * Dimensión falsable que la hipótesis pone a prueba (esquema `TipoHipotesis`):
 * `problema` (el problema existe y duele), `mercado` (hay un segmento alcanzable
 * que lo padece) y `pago` (hay disposición a pagar por resolverlo).
 */
export const tipoHipotesisSchema = z.enum(['problema', 'mercado', 'pago']);
export type TipoHipotesis = z.infer<typeof tipoHipotesisSchema>;

/**
 * Estado de aprendizaje de la hipótesis (esquema `EstadoHipotesis`). Nace
 * `pendiente`; el usuario la marca `confirmada` o `refutada` según la evidencia.
 */
export const estadoHipotesisSchema = z.enum([
  'pendiente',
  'confirmada',
  'refutada',
]);
export type EstadoHipotesis = z.infer<typeof estadoHipotesisSchema>;
