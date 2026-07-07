import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { proveedorIdSchema } from '../catalogo/proveedor.types';

/**
 * Cuerpo de `PUT /proveedores/configuracion`. La `apiKey` es write-only: se
 * acepta aquí pero nunca se devuelve (RNF-07). Los modelos se validan contra el
 * catálogo del proveedor en el servicio.
 */
export const guardarByokSchema = z.object({
  proveedor: proveedorIdSchema,
  apiKey: z.string().min(1),
  modeloScoring: z.string().min(1),
  modeloVeredicto: z.string().min(1),
});
export class GuardarByokDto extends createZodDto(guardarByokSchema) {}
