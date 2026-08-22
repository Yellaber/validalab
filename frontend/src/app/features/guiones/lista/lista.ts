import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ErrorApi } from '../../../core/api/error-api.model';
import { Guion } from '../../../core/api/guion.model';
import { RespuestaPaginada } from '../../../core/api/paginacion.model';
import { GuionesService } from '../guiones.service';

/**
 * Listado de los guiones propios. La carga es un `httpResource` reactivo a los
 * signals de paginación, igual que el portafolio (E1).
 *
 * El contrato **no expone filtro ni búsqueda** en esta colección, así que la vista
 * tampoco los ofrece: filtrar en cliente solo vería la página actual y daría una
 * falsa sensación de completitud.
 */
@Component({
  selector: 'app-lista-guiones',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lista.html',
  styleUrls: ['../../../shared/dominio.css', '../guiones.css'],
})
export class ListaGuiones {
  private readonly guiones = inject(GuionesService);

  protected readonly pagina = signal(1);
  protected readonly porPagina = signal(20);

  protected readonly recurso = httpResource<RespuestaPaginada<Guion>>(() =>
    this.guiones.solicitudListado({ pagina: this.pagina(), porPagina: this.porPagina() }),
  );

  protected readonly filas = computed<Guion[]>(() => this.recurso.value()?.datos ?? []);
  protected readonly paginacion = computed(() => this.recurso.value()?.paginacion);
  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi ? e : new ErrorApi('ERROR_RED', 'No se pudieron cargar.');
  });
  protected readonly vacio = computed(
    () => !this.cargando() && !this.error() && this.filas().length === 0,
  );

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
