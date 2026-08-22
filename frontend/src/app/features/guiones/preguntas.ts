import { Pregunta, PreguntaRequest } from '../../core/api/guion.model';

/**
 * Fila de pregunta **mientras se edita**, distinta de la `Pregunta` del contrato.
 *
 * No lleva `orden`: la posición en el arreglo *es* el orden, y el número se calcula
 * solo al enviar (`aRequests`), de modo que no puedan divergir lo que el usuario ve
 * y lo que se manda.
 *
 * Tampoco lleva `id`: `PreguntaRequest` no lo acepta, así que no hay nada del
 * servidor que preservar al escribir. La `claveLocal` **no es** ese `id`: existe solo
 * para dar a `@for` un `track` estable al reordenar —si se trackeara por índice, el
 * nodo del DOM se quedaría anclado a la posición y el foco no acompañaría a la fila
 * movida— y nunca sale del cliente.
 */
export interface FilaPregunta {
  claveLocal: string;
  texto: string;
}

let secuencia = 0;

/** Clave local, única dentro de la sesión del editor. Nunca se envía. */
function nuevaClave(): string {
  secuencia += 1;
  return `fila-${secuencia}`;
}

/** Crea una fila, vacía por defecto (el alta arranca con una, D8). */
export function filaNueva(texto = ''): FilaPregunta {
  return { claveLocal: nuevaClave(), texto };
}

/**
 * Vuelca las preguntas del servidor al editor, respetando su `orden`. El `orden` se
 * descarta una vez ordenadas: a partir de aquí manda la posición.
 */
export function filasDesde(preguntas: readonly Pregunta[]): FilaPregunta[] {
  return [...preguntas].sort((a, b) => a.orden - b.orden).map((p) => filaNueva(p.texto));
}

/**
 * Devuelve las filas con la de `indice` desplazada un puesto (`-1` arriba, `1` abajo).
 * Fuera de rango devuelve el arreglo original sin tocar: los extremos no se mueven.
 */
export function moverFila(
  filas: readonly FilaPregunta[],
  indice: number,
  direccion: -1 | 1,
): FilaPregunta[] {
  const destino = indice + direccion;
  if (indice < 0 || indice >= filas.length || destino < 0 || destino >= filas.length) {
    return [...filas];
  }
  const copia = [...filas];
  [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
  return copia;
}

/**
 * Construye el cuerpo del contrato: `orden` **contiguo y base 1** derivado de la
 * posición, y solo `texto` y `orden` — ni la `claveLocal` ni ningún `id`.
 */
export function aRequests(filas: readonly FilaPregunta[]): PreguntaRequest[] {
  return filas.map((fila, indice) => ({ orden: indice + 1, texto: fila.texto.trim() }));
}
