import { PrecioModelo } from './precio-modelo.entity';

/**
 * Costo de un consumo dado su precio y sus tokens: `tokens × precio por millón`.
 * Función pura y punto ÚNICO de la fórmula de costo (E8), consumida por
 * `CostoService` (por ejecución) y por `ReevaluacionService` (tokens agregados).
 */
export function costoDe(
  precio: PrecioModelo,
  tokensEntrada: number,
  tokensSalida: number,
): number {
  return (
    (tokensEntrada / 1_000_000) * precio.precioEntradaPorMillon +
    (tokensSalida / 1_000_000) * precio.precioSalidaPorMillon
  );
}
