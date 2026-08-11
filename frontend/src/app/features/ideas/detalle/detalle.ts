import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import { Idea } from '../../../core/api/idea.model';
import { ETIQUETA_ESTADO } from '../estado-idea';
import { IdeasService } from '../ideas.service';

/**
 * Detalle de una idea propia. Carga con `httpResource` (recargable tras mutar) y
 * ofrece editar/archivar/desarchivar según el `estado`. Ramifica los errores por su
 * `codigo`: `ACCESO_DENEGADO` no revela datos, `RECURSO_NO_ENCONTRADO` es idea
 * inexistente, y `CONFLICTO` al desarchivar explica que no estaba archivada.
 */
@Component({
  selector: 'app-detalle-idea',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle.html',
  styleUrl: '../ideas.css',
})
export class DetalleIdea {
  private readonly ideas = inject(IdeasService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly id = this.ruta.snapshot.paramMap.get('id') ?? '';
  protected readonly etiqueta = ETIQUETA_ESTADO;

  protected readonly recurso = httpResource<Idea>(() => this.ideas.solicitudDetalle(this.id));

  protected readonly idea = computed(() => this.recurso.value());
  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi ? e : new ErrorApi('ERROR_RED', 'No se pudo cargar la idea.');
  });
  protected readonly esArchivada = computed(() => this.idea()?.estado === 'archivada');

  protected readonly accionEnCurso = signal(false);
  protected readonly errorAccion = signal<string | null>(null);

  archivar(): void {
    void this.ejecutar(this.ideas.archivar(this.id));
  }

  desarchivar(): void {
    void this.ejecutar(this.ideas.desarchivar(this.id));
  }

  private async ejecutar(operacion: Observable<Idea>): Promise<void> {
    this.errorAccion.set(null);
    this.accionEnCurso.set(true);
    try {
      await firstValueFrom(operacion);
      this.recurso.reload();
    } catch (error) {
      this.errorAccion.set(this.mensajeDeError(error));
    } finally {
      this.accionEnCurso.set(false);
    }
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'CONFLICTO') {
        return 'La idea no está archivada, no se puede reabrir.';
      }
      if (error.codigo === 'ACCESO_DENEGADO') {
        return 'No tienes acceso a esta idea.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'La idea ya no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo completar la acción. Inténtalo de nuevo.';
  }
}
