import { z } from 'zod';

/**
 * Proveedor de IA soportado (`ProveedorId`). Conjunto FIJO del contrato; un
 * cuarto proveedor entraría por el adaptador común (RNF-06). Los MODELOS de cada
 * proveedor, en cambio, son datos actualizables sin redesplegar (tabla `modelos_ia`).
 */
export const proveedorIdSchema = z.enum(['anthropic', 'openai', 'google']);
export type ProveedorId = z.infer<typeof proveedorIdSchema>;

/** Modelo idóneo para el análisis dentro de un proveedor (`ModeloIA`). */
export const modeloIaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().optional(),
});
export type ModeloIaDominio = z.infer<typeof modeloIaSchema>;

/** Proveedor soportado con su lista curada de modelos (`ProveedorIA`). */
export const proveedorIaSchema = z.object({
  id: proveedorIdSchema,
  nombre: z.string(),
  modelos: z.array(modeloIaSchema),
});
export type ProveedorIaDominio = z.infer<typeof proveedorIaSchema>;

/**
 * Proveedores soportados con su nombre visible, en el orden del catálogo. El
 * conjunto es fijo (contrato); solo los modelos son datos. Añadir un proveedor
 * implica ampliar el enum y esta constante (más el adaptador de RNF-06).
 */
export const PROVEEDORES: { id: ProveedorId; nombre: string }[] = [
  { id: 'anthropic', nombre: 'Anthropic' },
  { id: 'openai', nombre: 'OpenAI' },
  { id: 'google', nombre: 'Google' },
];
