import { Cita, CrearCitaRequest } from '../../../core/api/entrevista.model';

/**
 * Fila de cita **mientras se edita**, distinta de la `Cita` del contrato.
 *
 * La `claveLocal` da a `@for` un `track` estable al eliminar filas y nunca sale del
 * cliente. Misma lección que el editor de preguntas de E4a: el `@for` debe recorrer
 * el **modelo plano** y enlazar el campo por índice, porque resolver el estado de un
 * campo dentro del `track` lanza `NG01904: Orphan field` al encoger el arreglo.
 *
 * Dos diferencias con las preguntas de un guión, y son las que justifican no
 * compartir módulo: una cita **no tiene `orden`** —no hay nada que numerar por
 * posición— y **puede haber cero**, porque el contrato no las exige.
 */
export interface FilaCita {
  claveLocal: string;
  texto: string;
  contexto: string;
}

let secuencia = 0;

/** Clave local, única dentro de la sesión del editor. Nunca se envía. */
function nuevaClave(): string {
  secuencia += 1;
  return `cita-${secuencia}`;
}

/** Crea una fila de cita, vacía por defecto. */
export function filaNueva(texto = '', contexto = ''): FilaCita {
  return { claveLocal: nuevaClave(), texto, contexto };
}

/** Vuelca las citas del servidor al editor, descartando su `id`. */
export function filasDesde(citas: readonly Cita[]): FilaCita[] {
  return citas.map((c) => filaNueva(c.texto, c.contexto ?? ''));
}

/**
 * Construye el cuerpo del contrato. **Omite las filas sin texto** —una cita en
 * blanco no es evidencia— y el `contexto` cuando está vacío. Nunca incluye la
 * `claveLocal` ni ningún `id`.
 */
export function aRequests(filas: readonly FilaCita[]): CrearCitaRequest[] {
  return filas
    .filter((fila) => fila.texto.trim())
    .map((fila) => {
      const cita: CrearCitaRequest = { texto: fila.texto.trim() };
      if (fila.contexto.trim()) {
        cita.contexto = fila.contexto.trim();
      }
      return cita;
    });
}
