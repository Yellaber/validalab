import { z, ZodType } from 'zod';

/** Bloque `paginacion` de toda respuesta de colección (esquema `Paginacion`). */
export const paginacionSchema = z.object({
  pagina: z.number().int(),
  porPagina: z.number().int(),
  total: z.number().int(),
  totalPaginas: z.number().int(),
});

/**
 * Esquema de respuesta paginada paramétrico por el tipo de elemento (sobre
 * `RespuestaPaginada` del contrato). La fundación lo provee para que ningún
 * módulo reimplemente el bloque `{ datos, paginacion }`.
 */
export function esquemaPaginado<T extends ZodType>(item: T) {
  return z.object({
    datos: z.array(item),
    paginacion: paginacionSchema,
  });
}
