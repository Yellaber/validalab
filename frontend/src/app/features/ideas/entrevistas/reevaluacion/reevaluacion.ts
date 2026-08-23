import { CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../../core/api/error-api.model';
import {
  EstimacionReevaluacion,
  ResultadoReevaluacion,
} from '../../../../core/api/reevaluacion.model';
import { ReevaluacionService } from './reevaluacion.service';

/**
 * Re-evaluación en lote de las entrevistas de una idea tras un cambio de rúbrica
 * (E8b). Primero muestra la **estimación** (cuántas entrevistas cambiaron y cuánto
 * costaría re-puntuarlas), sin ejecutar nada; si el usuario confirma, ejecuta el
 * lote y muestra el resultado real (re-puntuadas, omitidas y costo).
 *
 * Es una acción **explícita**: un cambio de rúbrica no la dispara. El costo es un
 * estimado del consumo vía ValidaLab, no el saldo (RNF-17).
 */
@Component({
  selector: 'app-reevaluacion-lote',
  imports: [RouterLink, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reevaluacion.html',
  styleUrls: ['../../../../shared/dominio.css'],
})
export class ReevaluacionLote {
  private readonly reevaluacion = inject(ReevaluacionService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';

  protected readonly recurso = httpResource<EstimacionReevaluacion>(() =>
    this.reevaluacion.solicitudEstimacion(this.ideaId),
  );

  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi
      ? e
      : new ErrorApi('ERROR_RED', 'No se pudo cargar la estimación.');
  });

  protected readonly estimacion = computed(() =>
    this.recurso.hasValue() ? this.recurso.value() : null,
  );
  protected readonly sinAfectadas = computed(
    () => this.estimacion()?.entrevistasAfectadas === 0,
  );
  protected readonly sinByok = computed(() => this.estimacion()?.modeloScoring == null);

  protected readonly ejecutando = signal(false);
  protected readonly resultado = signal<ResultadoReevaluacion | null>(null);
  protected readonly errorAccion = signal<string | null>(null);

  reintentar(): void {
    this.recurso.reload();
  }

  /**
   * Ejecuta el lote (todas las afectadas). Tras terminar, muestra el resultado y
   * recarga la estimación: si todo se re-puntuó, quedará en cero afectadas.
   */
  async ejecutar(): Promise<void> {
    this.ejecutando.set(true);
    this.errorAccion.set(null);
    this.resultado.set(null);
    try {
      const resultado = await firstValueFrom(this.reevaluacion.ejecutar(this.ideaId));
      this.resultado.set(resultado);
      this.recurso.reload();
    } catch (error) {
      this.errorAccion.set(this.mensajeDeError(error));
    } finally {
      this.ejecutando.set(false);
    }
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'CONFLICTO') {
        return 'Configura primero tu proveedor de IA (BYOK) para re-evaluar.';
      }
      if (error.codigo === 'PROVEEDOR_IA_NO_DISPONIBLE') {
        return 'El proveedor de IA no está disponible ahora mismo. Inténtalo más tarde.';
      }
      if (error.codigo === 'ACCESO_DENEGADO') {
        return 'No tienes acceso a esta idea.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'Esta idea ya no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo ejecutar la re-evaluación. Inténtalo de nuevo.';
  }
}
