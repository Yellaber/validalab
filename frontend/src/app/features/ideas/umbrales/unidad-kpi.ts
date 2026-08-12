import { UnidadKpi } from '../../../core/api/umbral.model';

/**
 * Presentación y transporte de los valores de umbral según la `unidad` que trae
 * cada `Umbral` en la respuesta del contrato.
 *
 * El único caso donde presentación y transporte difieren es `porcentaje`: el
 * contrato lo transporta como **tasa 0–1** (`0.25` = 25%), pero se edita en
 * **puntos porcentuales** (`25`), porque pedirle al usuario que escriba `0.25`
 * para "25%" es una fuente de error de un orden de magnitud en un valor que
 * decide un kill. La conversión redondea explícitamente en ambos sentidos para no
 * arrastrar ruido de coma flotante.
 */
export interface FormatoUnidad {
  /** Sufijo mostrado junto al control (vacío si la unidad no lo necesita). */
  sufijo: string;
  /** Salto del control numérico, en la unidad de presentación. */
  paso: number;
  minimo: number;
  /** Tope de la unidad, o `null` si no lo tiene. */
  maximo: number | null;
  /** Decimales admitidos en la unidad de presentación. */
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

/** Valor del contrato → valor mostrado y editado (`0.25` → `25` en porcentaje). */
export function aPresentacion(valor: number, unidad: string): number {
  const { decimales } = formatoDe(unidad);
  return redondear(unidad === 'porcentaje' ? valor * 100 : valor, decimales);
}

/** Valor editado → valor del contrato (`25` → `0.25` en porcentaje). */
export function aTransporte(valor: number, unidad: string): number {
  return redondear(unidad === 'porcentaje' ? valor / 100 : valor, decimalesTransporte(unidad));
}

/** Texto del control a partir del valor del contrato; cadena vacía si no hay valor. */
export function textoDe(valor: number | null, unidad: string): string {
  return valor === null ? '' : String(aPresentacion(valor, unidad));
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
 * Motivo por el que un valor de presentación no encaja en su unidad, o `null` si
 * es válido. Espeja la validación del backend sin sustituirla.
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
  return null;
}
