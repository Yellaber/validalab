import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ErrorApi } from '../../../core/api/error-api.model';
import { EstadoIdea } from '../../../core/api/idea.model';
import { RespuestaPaginada } from '../../../core/api/paginacion.model';
import { Idea } from '../../../core/api/idea.model';
import { ESTADOS_IDEA, ETIQUETA_ESTADO } from '../estado-idea';
import { IdeasService } from '../ideas.service';

/**
 * Listado del portafolio de ideas. La carga es un `httpResource` reactivo a los
 * signals de paginación y filtro: al cambiar `pagina`/`filtroEstado` se reejecuta
 * solo. Distingue carga / vacío / error, ramificando el error por su `codigo`.
 */
@Component({
  selector: 'app-lista-ideas',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lista.html',
  styleUrl: '../ideas.css',
})
export class ListaIdeas {
  private readonly ideas = inject(IdeasService);

  protected readonly pagina = signal(1);
  protected readonly porPagina = signal(20);
  protected readonly filtroEstado = signal<EstadoIdea | ''>('');

  protected readonly estados = ESTADOS_IDEA;
  protected readonly etiqueta = ETIQUETA_ESTADO;

  protected readonly recurso = httpResource<RespuestaPaginada<Idea>>(() =>
    this.ideas.solicitudListado({
      pagina: this.pagina(),
      porPagina: this.porPagina(),
      estado: this.filtroEstado() || undefined,
    }),
  );

  protected readonly ideasPagina = computed(() => this.recurso.value()?.datos ?? []);
  protected readonly paginacion = computed(() => this.recurso.value()?.paginacion);
  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi
      ? e
      : new ErrorApi('ERROR_RED', 'No se pudo cargar el portafolio.');
  });
  protected readonly vacio = computed(
    () => !this.cargando() && !this.error() && this.ideasPagina().length === 0,
  );

  cambiarFiltro(valor: string): void {
    this.filtroEstado.set(valor as EstadoIdea | '');
    this.pagina.set(1);
  }

  paginaAnterior(): void {
    if (this.pagina() > 1) {
      this.pagina.update((p) => p - 1);
    }
  }

  paginaSiguiente(): void {
    const total = this.paginacion()?.totalPaginas ?? 1;
    if (this.pagina() < total) {
      this.pagina.update((p) => p + 1);
    }
  }

  reintentar(): void {
    this.recurso.reload();
  }
}
