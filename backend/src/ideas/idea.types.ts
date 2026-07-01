import { z } from 'zod';

/**
 * Estado de validación de una idea (esquema `EstadoIdea` del contrato). Una idea
 * nace en `borrador`; `en_validacion` se origina con las entrevistas (E4);
 * `go`/`pivote`/`kill` provienen del veredicto aprobado (E6) y NO se fijan por
 * edición en E1; `archivada` la retira del tablero activo conservando su evidencia.
 */
export const estadoIdeaSchema = z.enum([
  'borrador',
  'en_validacion',
  'go',
  'pivote',
  'kill',
  'archivada',
]);
export type EstadoIdea = z.infer<typeof estadoIdeaSchema>;
