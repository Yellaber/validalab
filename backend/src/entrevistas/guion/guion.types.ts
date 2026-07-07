import { z } from 'zod';

/**
 * Pregunta ordenada de un guión de entrevista (esquema `Pregunta`). Es un
 * value-object embebido en el guión: su `id` lo genera la aplicación al crear o
 * reemplazar el conjunto de preguntas. `orden` es base 1.
 */
export const preguntaSchema = z.object({
  id: z.uuid(),
  orden: z.number().int().min(1),
  texto: z.string(),
});
export type Pregunta = z.infer<typeof preguntaSchema>;
