import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Contacto, EstadoOutreach } from '../../../../core/api/contacto.model';
import { ErrorApi } from '../../../../core/api/error-api.model';
import { RespuestaPaginada } from '../../../../core/api/paginacion.model';
import { ContactosService } from '../contactos.service';
import { ESTADOS_FILTRO, ETIQUETA_CANAL, ETIQUETA_ESTADO_OUTREACH, toquesDe } from '../embudo';

/** Fila ya derivada para la plantilla: el recuento de toques sale de las dos fechas. */
interface VistaContacto {
  contacto: Contacto;
  toques: number;
}

/**
 * Listado del embudo de outreach de una idea. La carga es un `httpResource` reactivo
 * a los signals de paginación y filtro, igual que el portafolio (E1).
 *
 * El filtro ofrece los **seis** estados, `entrevistado` incluido: un contacto puede
 * estar ahí (lo pone E4) aunque no se pueda transicionar allí manualmente.
 *
 * Un contacto es información personal: ante `ACCESO_DENEGADO` la vista no renderiza
 * ningún dato, y el error va en lugar del contenido, nunca junto a él.
 */
@Component({
  selector: 'app-lista-contactos',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lista.html',
  styleUrls: ['../../ideas.css', '../contactos.css'],
})
export class ListaContactos {
  private readonly contactos = inject(ContactosService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';

  protected readonly pagina = signal(1);
  protected readonly porPagina = signal(20);
  protected readonly filtroEstado = signal<EstadoOutreach | ''>('');

  protected readonly estados = ESTADOS_FILTRO;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO_OUTREACH;
  protected readonly etiquetaCanal = ETIQUETA_CANAL;

  protected readonly recurso = httpResource<RespuestaPaginada<Contacto>>(() =>
    this.contactos.solicitudListado(this.ideaId, {
      pagina: this.pagina(),
      porPagina: this.porPagina(),
      estado: this.filtroEstado() || undefined,
    }),
  );

  protected readonly filas = computed<VistaContacto[]>(() =>
    (this.recurso.value()?.datos ?? []).map((contacto) => ({
      contacto,
      toques: toquesDe(contacto),
    })),
  );
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

  cambiarFiltro(valor: string): void {
    this.filtroEstado.set(valor as EstadoOutreach | '');
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
