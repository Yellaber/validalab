import { DestroyRef, Signal, computed, inject, signal } from '@angular/core';
import { EstadoScoring } from '../../../core/api/entrevista.model';

/** Cada cuánto se vuelve a preguntar mientras el agente puntúa. */
export const INTERVALO_MS = 3000;

/**
 * Cuántas veces como máximo. Con el intervalo de 3 s son ~60 s, holgado para un
 * scoring normal y corto para que un scoring atascado no genere tráfico perpetuo.
 */
export const MAX_INTENTOS = 20;

/** Estados en los que el agente aún puede cambiar el resultado. */
const EN_CURSO: ReadonlySet<EstadoScoring> = new Set<EstadoScoring>(['pendiente', 'procesando']);

export interface SeguimientoScoring {
  /** Se agotaron los intentos con el scoring aún en curso. */
  agotado: Signal<boolean>;
  /** Hay una consulta programada ahora mismo. */
  activo: Signal<boolean>;
  /** Informa del estado recién recibido; decide si programar otra consulta. */
  sincronizar(estado: EstadoScoring | undefined): void;
  /** Reinicia el contador: tras un refresco manual o un re-disparo del scoring. */
  reiniciar(): void;
  detener(): void;
}

/**
 * Seguimiento del scoring asíncrono mediante **polling acotado con corte**.
 *
 * El contrato no expone websockets ni webhooks, así que la única forma de enterarse
 * de que el agente terminó es volver a preguntar. Se hace con tres límites:
 *
 * - **Solo mientras haga falta**: una entrevista `puntuada` o `fallida` no programa
 *   ni una sola consulta.
 * - **Con corte** (`MAX_INTENTOS`): un scoring atascado en `procesando` deja de
 *   consultarse y la vista pasa a ofrecer refresco manual, en vez de martillear el
 *   backend indefinidamente.
 * - **Atado al ciclo de vida**: se cancela al destruir el componente, sin dejar
 *   temporizadores huérfanos tras la navegación.
 *
 * Debe invocarse en un contexto de inyección, porque usa `inject(DestroyRef)`.
 */
export function seguimientoScoring(recargar: () => void): SeguimientoScoring {
  const intentos = signal(0);
  const temporizador = signal<ReturnType<typeof setTimeout> | null>(null);

  const cancelar = (): void => {
    const pendiente = temporizador();
    if (pendiente !== null) {
      clearTimeout(pendiente);
      temporizador.set(null);
    }
  };

  inject(DestroyRef).onDestroy(cancelar);

  return {
    agotado: computed(() => intentos() >= MAX_INTENTOS),
    activo: computed(() => temporizador() !== null),

    sincronizar(estado: EstadoScoring | undefined): void {
      cancelar();

      if (!estado || !EN_CURSO.has(estado)) {
        // Terminó (o aún no hay datos): nada que seguir, y el contador vuelve a cero
        // para que un futuro re-disparo disponga de todos los intentos.
        intentos.set(0);
        return;
      }
      if (intentos() >= MAX_INTENTOS) {
        return;
      }

      temporizador.set(
        setTimeout(() => {
          temporizador.set(null);
          intentos.update((n) => n + 1);
          recargar();
        }, INTERVALO_MS),
      );
    },

    reiniciar(): void {
      cancelar();
      intentos.set(0);
    },

    detener: cancelar,
  };
}
