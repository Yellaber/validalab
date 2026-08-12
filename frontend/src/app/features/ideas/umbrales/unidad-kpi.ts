import { UnidadKpi } from '../../../core/api/umbral.model';

/**
 * Presentación y transporte de los valores de umbral según la `unidad` que trae
 * cada `Umbral` en la respuesta del contrato.
 *
 * El único caso donde presentación y transporte difieren es `porcentaje`: el
 * contrato lo transporta como **tasa 0–1** (`0.25` = 25%), pero se edita en
 * **puntos porcentuales** (`25`), porque pedirle al usuario que escriba `0.25`
 * para "25%" es una fuente de error de un orden de magnitud en un valor que
 * decide un kill.
 *
 * Precisión: `decimales` gobierna **solo la entrada** (lo que tiene sentido fijar a
 * mano). La presentación es **fiel** al valor del contrato, que no declara precisión
 * alguna: se muestra lo que hay. El redondeo sobrevive únicamente en `aTransporte`,
 * sobre lo tecleado.
 */
export interface FormatoUnidad {
  /** Sufijo mostrado junto al control (vacío si la unidad no lo necesita). */
  sufijo: string;
  /** Salto del control numérico, en la unidad de presentación. */
  paso: number;
  minimo: number;
  /** Tope de la unidad, o `null` si no lo tiene. */
  maximo: number | null;
  /** Precisión de **entrada**: decimales que el usuario puede teclear. No limita lo que se muestra. */
  decimales: number;
}

export const FORMATO_UNIDAD: Record<UnidadKpi, FormatoUnidad> = {
  porcentaje: { sufijo: '%', paso: 1, minimo: 0, maximo: 100, decimales: 1 },
  conteo: { sufijo: '', paso: 1, minimo: 0, maximo: null, decimales: 0 },
  conteo_semanal: { sufijo: '/semana', paso: 1, minimo: 0, maximo: null, decimales: 0 },
  ratio: { sufijo: '', paso: 0.1, minimo: 0, maximo: null, decimales: 2 },
  puntaje_0_10: { sufijo: '/10', paso: 0.1, minimo: 0, maximo: 10, decimales: 1 },
};

/** Formato de una unidad; degrada a `ratio` (el más permisivo) si es desconocida. */
export function formatoDe(unidad: string): FormatoUnidad {
  return FORMATO_UNIDAD[unidad as UnidadKpi] ?? FORMATO_UNIDAD.ratio;
}

/** Redondeo explícito a `decimales`, para no arrastrar ruido de coma flotante. */
export function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

/** Decimales necesarios en el transporte: el porcentaje gana dos al dividir entre 100. */
function decimalesTransporte(unidad: string): number {
  const { decimales } = formatoDe(unidad);
  return unidad === 'porcentaje' ? decimales + 2 : decimales;
}

/**
 * Decimales a los que se sanea la presentación. NO es redondeo de presentación: el
 * contrato no fija precisión y el backend puede guardar más de la que se teclea, así
 * que ese valor se muestra íntegro. Esto solo recorta el ruido de coma flotante de
 * IEEE-754 (que aparece más allá del decimal 15), porque `0.1 + 0.2` guardado como
 * `0.30000000000000004` es un artefacto del cálculo, no una decisión de nadie.
 * Diez decimales en unidad de presentación es una billonésima de tasa: ningún umbral
 * de validación tiene significado a esa escala.
 */
const DECIMALES_SANEAMIENTO = 10;

/**
 * Valor del contrato → valor mostrado y editado (`0.25` → `25` en porcentaje).
 * Convierte de unidad pero NO redondea a la precisión de entrada: mostrar `33.3` un
 * umbral guardado como `0.3333` haría juzgar un criterio de kill sobre una cifra que
 * no es la almacenada.
 */
export function aPresentacion(valor: number, unidad: string): number {
  return redondear(unidad === 'porcentaje' ? valor * 100 : valor, DECIMALES_SANEAMIENTO);
}

/**
 * Valor editado → valor del contrato (`25` → `0.25` en porcentaje). Único punto donde
 * sobrevive el redondeo a la precisión de la unidad, porque solo se aplica a lo que
 * el usuario teclea.
 */
export function aTransporte(valor: number, unidad: string): number {
  return redondear(unidad === 'porcentaje' ? valor / 100 : valor, decimalesTransporte(unidad));
}

/**
 * Notación decimal garantizada. `String()` emite exponencial por debajo de `1e-6`
 * (`"1e-7"`), ilegible en un control de umbral y ambigua al reeditarla.
 */
function aDecimal(valor: number): string {
  const texto = String(valor);
  if (!texto.includes('e') && !texto.includes('E')) {
    return texto;
  }
  return valor.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
}

/** Texto del control a partir del valor del contrato; cadena vacía si no hay valor. */
export function textoDe(valor: number | null, unidad: string): string {
  return valor === null ? '' : aDecimal(aPresentacion(valor, unidad));
}

/** Parsea el texto del control; `null` si no es un número finito. */
export function parsear(texto: string): number | null {
  const limpio = texto.trim();
  if (!limpio) {
    return null;
  }
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : null;
}

/**
 * Motivo por el que un valor **tecleado** no encaja en su unidad, o `null` si es
 * válido. Espeja la validación del backend sin sustituirla.
 *
 * Solo debe aplicarse a campos que el usuario editó: un valor vigente es autoridad
 * del backend, no una entrada, y bloquear su fila impediría corregir el otro campo.
 */
export function motivoFueraDeRango(valor: number, unidad: string): string | null {
  const { minimo, maximo, decimales, sufijo } = formatoDe(unidad);
  if (valor < minimo) {
    return `No puede ser menor que ${minimo}${sufijo}.`;
  }
  if (maximo !== null && valor > maximo) {
    return `No puede ser mayor que ${maximo}${sufijo}.`;
  }
  if (decimales === 0 && !Number.isInteger(valor)) {
    return 'Debe ser un número entero.';
  }
  // `decimales` es la precisión de **entrada**: lo que tiene sentido fijar a mano.
  // Teclear más se rechaza en vez de truncarse en silencio al convertir. Un valor
  // vigente más fino sí se muestra y se conserva; ver la nota de arriba.
  if (decimales > 0 && redondear(valor, decimales) !== valor) {
    return decimales === 1
      ? 'Admite como máximo 1 decimal.'
      : `Admite como máximo ${decimales} decimales.`;
  }
  return null;
}
