import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { proveedorIdSchema } from '../catalogo/proveedor.types';
import { ConfiguracionByok } from './configuracion-byok.entity';

/**
 * Recurso `ConfiguracionByok` del contrato. NUNCA incluye la API key (RNF-07):
 * solo `apiKeyRegistrada` indica su presencia.
 */
export const configuracionByokSchema = z.object({
  proveedor: proveedorIdSchema,
  modeloScoring: z.string(),
  modeloVeredicto: z.string(),
  apiKeyRegistrada: z.boolean(),
  fechaActualizacion: z.iso.datetime(),
});
export type ConfiguracionByokRespuesta = z.infer<
  typeof configuracionByokSchema
>;
export class ConfiguracionByokDto extends createZodDto(
  configuracionByokSchema,
) {}

/**
 * Mapea la entidad al recurso del contrato SIN la key: `apiKeyRegistrada` es
 * `true` porque una configuración persistida siempre tiene su key cifrada.
 */
export function aConfiguracionDto(
  config: ConfiguracionByok,
): ConfiguracionByokRespuesta {
  return {
    proveedor: config.proveedor,
    modeloScoring: config.modeloScoring,
    modeloVeredicto: config.modeloVeredicto,
    apiKeyRegistrada: true,
    fechaActualizacion: config.fechaActualizacion.toISOString(),
  };
}
