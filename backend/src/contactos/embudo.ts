import { EstadoOutreach } from './contacto.types';

/**
 * Máquina de estados del embudo de outreach (RF-06). Para cada estado, los
 * destinos permitidos por una transición manual (`POST .../estado`):
 *
 *   por_contactar → contactado → respondio → agendado
 *
 * `descartado` es alcanzable desde cualquier estado no terminal. `entrevistado`
 * NO aparece como destino: solo lo asigna el registro de una entrevista (E4);
 * pedirlo por esta vía es una transición inválida (→ 409). `entrevistado` y
 * `descartado` son terminales (sin transiciones de salida).
 */
export const TRANSICIONES: Record<EstadoOutreach, EstadoOutreach[]> = {
  por_contactar: ['contactado', 'descartado'],
  contactado: ['respondio', 'descartado'],
  respondio: ['agendado', 'descartado'],
  agendado: ['descartado'],
  entrevistado: [],
  descartado: [],
};

/** `true` si mover de `desde` a `hacia` es una transición permitida del embudo. */
export function esTransicionValida(
  desde: EstadoOutreach,
  hacia: EstadoOutreach,
): boolean {
  return TRANSICIONES[desde].includes(hacia);
}
