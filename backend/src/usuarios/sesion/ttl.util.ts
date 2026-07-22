/** Unidades de tiempo admitidas en un TTL (`s`egundos, `m`inutos, `h`oras, `d`ías). */
const UNIDADES_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Convierte un TTL con formato `<n><unidad>` (p. ej. `30d`, `12h`, `15m`) a
 * milisegundos. Punto ÚNICO de esta gramática: lo consumen tanto la vigencia del
 * refresh token en BD (`ServicioDeTokens`) como el `Max-Age` de la cookie de
 * refresh, para que no diverjan. Un formato inválido lanza (fail-fast).
 */
export function parsearTtlMs(ttl: string): number {
  const m = /^(\d+)\s*(s|m|h|d)$/.exec(ttl.trim());
  if (!m) {
    throw new Error(`TTL inválido: "${ttl}" (usa p. ej. 30d, 12h, 15m).`);
  }
  return Number(m[1]) * UNIDADES_MS[m[2]];
}
