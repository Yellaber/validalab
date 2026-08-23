import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import { RespuestaPaginada } from '../../../core/api/paginacion.model';
import { Veredicto } from '../../../core/api/veredicto.model';
import { ETIQUETA_ESTADO_VEREDICTO, ETIQUETA_TIPO_VEREDICTO } from './etiquetas';
import { VeredictoService } from './veredicto.service';

const POR_PAGINA = 20;

/**
 * Historial de veredictos de una idea y la acción de **emitir** uno nuevo (E6).
 *
 * Emitir invoca al Validador Inteligente, que pondera los KPIs del tablero (E5) y
 * propone un juicio `go`/`pivote`/`kill`. El juicio nace en verificación
 * `pendiente`: no cambia el estado de la idea hasta que el humano lo aprueba en el
 * detalle. Aquí solo se lanza y se lista; el gobierno consultivo vive en el detalle.
 */
@Component({
  selector: 'app-veredictos-idea',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './veredicto.html',
  styleUrls: ['../../../shared/dominio.css'],
})
export class VeredictosIdea {
  private readonly veredictos = inject(VeredictoService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';

  protected readonly etiquetaTipo = ETIQUETA_TIPO_VEREDICTO;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO_VEREDICTO;

  protected readonly pagina = signal(1);

  protected readonly recurso = httpResource<RespuestaPaginada<Veredicto>>(() =>
    this.veredictos.solicitudHistorial(this.ideaId, {
      pagina: this.pagina(),
      porPagina: POR_PAGINA,
    }),
  );

  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi
      ? e
      : new ErrorApi('ERROR_RED', 'No se pudo cargar el historial de veredictos.');
  });

  protected readonly historial = computed(() =>
    this.recurso.hasValue() ? this.recurso.value().datos : [],
  );
  protected readonly paginacion = computed(() =>
    this.recurso.hasValue() ? this.recurso.value().paginacion : null,
  );
  protected readonly vacio = computed(
    () => this.recurso.hasValue() && this.historial().length === 0,
  );

  protected readonly emitiendo = signal(false);
  protected readonly errorAccion = signal<string | null>(null);

  reintentar(): void {
    this.recurso.reload();
  }

  paginaAnterior(): void {
    if (this.pagina() > 1) {
      this.pagina.update((p) => p - 1);
    }
  }

  paginaSiguiente(): void {
    const p = this.paginacion();
    if (p && this.pagina() < p.totalPaginas) {
      this.pagina.update((n) => n + 1);
    }
  }

  /**
   * Invoca al agente y navega al veredicto recién emitido para que el usuario lo
   * revise y lo verifique. La latencia del LLM se cubre con el estado `emitiendo`.
   */
  async emitir(): Promise<void> {
    this.emitiendo.set(true);
    this.errorAccion.set(null);
    try {
      const veredicto = await firstValueFrom(this.veredictos.emitir(this.ideaId));
      await this.router.navigate(['/ideas', this.ideaId, 'veredictos', veredicto.id]);
    } catch (error) {
      this.errorAccion.set(this.mensajeDeError(error));
    } finally {
      this.emitiendo.set(false);
    }
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'CONFLICTO') {
        return 'Configura primero tu proveedor de IA (BYOK) para poder emitir un veredicto.';
      }
      if (error.codigo === 'SALIDA_AGENTE_INVALIDA') {
        return 'El agente no devolvió un veredicto válido. Inténtalo de nuevo.';
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
    return 'No se pudo emitir el veredicto. Inténtalo de nuevo.';
  }
}
