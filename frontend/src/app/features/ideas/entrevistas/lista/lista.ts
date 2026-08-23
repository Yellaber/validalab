import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ESTADOS_SCORING, Entrevista, EstadoScoring } from '../../../../core/api/entrevista.model';
import { ErrorApi } from '../../../../core/api/error-api.model';
import { RespuestaPaginada } from '../../../../core/api/paginacion.model';
import { catalogosDeIdea } from '../catalogos';
import { EntrevistasService } from '../entrevistas.service';
import { ETIQUETA_ESTADO_SCORING } from '../etiquetas';

/** Fila ya resuelta para la plantilla: nombres, no identificadores. */
interface VistaEntrevista {
  entrevista: Entrevista;
  contacto: string;
  guion: string;
}

/**
 * Listado de las entrevistas de una idea, con los dos filtros del contrato
 * (`contactoId` y `estadoScoring`), ambos combinables.
 *
 * `Entrevista` solo trae identificadores, así que los catálogos de la idea se cargan
 * una vez y las filas consultan sus mapas: dos peticiones por pantalla, no una por
 * fila.
 *
 * El `estadoScoring` se muestra como etiqueta y ahí se para: sin polling y sin
 * acciones sobre el scoring, que son del change siguiente.
 */
@Component({
  selector: 'app-lista-entrevistas',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lista.html',
  styleUrls: ['../../../../shared/dominio.css', '../entrevistas.css'],
})
export class ListaEntrevistas {
  private readonly entrevistas = inject(EntrevistasService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';
  protected readonly catalogos = catalogosDeIdea(this.ideaId);

  protected readonly pagina = signal(1);
  protected readonly porPagina = signal(20);
  protected readonly filtroContacto = signal('');
  protected readonly filtroEstado = signal<EstadoScoring | ''>('');

  protected readonly estadosScoring = ESTADOS_SCORING;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO_SCORING;

  protected readonly recurso = httpResource<RespuestaPaginada<Entrevista>>(() =>
    this.entrevistas.solicitudListado(this.ideaId, {
      pagina: this.pagina(),
      porPagina: this.porPagina(),
      contactoId: this.filtroContacto() || undefined,
      estadoScoring: this.filtroEstado() || undefined,
    }),
  );

  protected readonly filas = computed<VistaEntrevista[]>(() => {
    const nombreContacto = this.catalogos.nombreContacto();
    const nombreGuion = this.catalogos.nombreGuion();
    return (this.recurso.value()?.datos ?? []).map((entrevista) => ({
      entrevista,
      contacto: nombreContacto(entrevista.contactoId),
      guion: nombreGuion(entrevista.guionId),
    }));
  });

  /**
   * El filtro ofrece **todos** los contactos de la idea, no solo los entrevistables:
   * mira al pasado, y por quien ya fue entrevistado es justo por quien interesa
   * filtrar. Derivarlo de la lista ya filtrada sería circular.
   */
  protected readonly contactosDelFiltro = this.catalogos.contactos;

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

  cambiarFiltroContacto(valor: string): void {
    this.filtroContacto.set(valor);
    this.pagina.set(1);
  }

  cambiarFiltroEstado(valor: string): void {
    this.filtroEstado.set(valor as EstadoScoring | '');
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
    this.catalogos.recargar();
  }
}
