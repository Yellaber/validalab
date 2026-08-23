import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { proveedorIdSchema } from '../catalogo/proveedor.types';
import { PrecioModelo } from './precio-modelo.entity';

/** Moneda del costo estimado y de la tabla de precios (`Moneda`). */
export const monedaSchema = z.enum(['USD']);
export type Moneda = z.infer<typeof monedaSchema>;

/**
 * Aclaración normativa del costo (SRS §8.9.1): es un estimado del consumo vía
 * ValidaLab, no el saldo de la cuenta. Texto ÚNICO compartido por el costo (E8a)
 * y la estimación de re-evaluación (E8b).
 */
export const ACLARACION_COSTO =
  'Es un estimado del consumo de IA vía ValidaLab, calculado localmente a partir de los tokens y la tabla de precios. NO es el saldo de tu cuenta del proveedor: el saldo solo es visible en el panel de facturación del proveedor.';

/** Recurso `PrecioModelo` del contrato: tarifa de un modelo por millón de tokens. */
export const precioModeloRespuestaSchema = z.object({
  proveedor: proveedorIdSchema,
  modeloId: z.string(),
  precioEntradaPorMillon: z.number().min(0),
  precioSalidaPorMillon: z.number().min(0),
  precioEntradaCacheadaPorMillon: z.number().min(0).nullable(),
  moneda: monedaSchema,
  vigenteDesde: z.iso.datetime(),
});
export type PrecioModeloRespuesta = z.infer<typeof precioModeloRespuestaSchema>;
export class PrecioModeloRespuestaDto extends createZodDto(
  precioModeloRespuestaSchema,
) {}

/** Tabla de precios completa. */
export const tablaPreciosSchema = z.array(precioModeloRespuestaSchema);
export class TablaPreciosDto extends createZodDto(tablaPreciosSchema) {}

/** Mapea la entidad `PrecioModelo` al recurso del contrato. */
export function aPrecioDto(precio: PrecioModelo): PrecioModeloRespuesta {
  return {
    proveedor: precio.proveedor,
    modeloId: precio.modeloId,
    precioEntradaPorMillon: precio.precioEntradaPorMillon,
    precioSalidaPorMillon: precio.precioSalidaPorMillon,
    precioEntradaCacheadaPorMillon: precio.precioEntradaCacheadaPorMillon,
    moneda: precio.moneda as Moneda,
    vigenteDesde: precio.vigenteDesde.toISOString(),
  };
}
