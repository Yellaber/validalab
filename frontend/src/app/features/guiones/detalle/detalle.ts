import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import { Guion, Pregunta } from '../../../core/api/guion.model';
import { GuionesService } from '../guiones.service';

/**
 * Detalle de un guión propio: su contenido, sus preguntas en orden y las acciones de
 * editar y eliminar.
 *
 * El borrado se confirma **en línea**, en dos pasos, sin `window.confirm`, con el
 * patrón ya establecido en hipótesis y contactos.
 *
 * Ante `ACCESO_DENEGADO` el error se renderiza **en lugar** del contenido, nunca junto
 * a él: la vista no revela ni el nombre ni el número de preguntas de un guión ajeno.
 */
@Component({
  selector: 'app-detalle-guion',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle.html',
  styleUrls: ['../../../shared/dominio.css', '../guiones.css'],
})
export class DetalleGuion {
  private readonly guiones = inject(GuionesService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly id = this.ruta.snapshot.paramMap.get('idGuion') ?? '';

  protected readonly recurso = httpResource<Guion>(() => this.guiones.solicitudDetalle(this.id));

  protected readonly guion = computed(() => this.recurso.value());
  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi ? e : new ErrorApi('ERROR_RED', 'No se pudo cargar el guión.');
  });

  /** Las preguntas se muestran por `orden` ascendente, no por el orden del arreglo. */
  protected readonly preguntas = computed<Pregunta[]>(() =>
    [...(this.guion()?.preguntas ?? [])].sort((a, b) => a.orden - b.orden),
  );

  protected readonly confirmandoBorrado = signal(false);
  protected readonly borrando = signal(false);
  protected readonly errorAccion = signal<string | null>(null);

  reintentar(): void {
    this.recurso.reload();
  }

  pedirBorrado(): void {
    this.errorAccion.set(null);
    this.confirmandoBorrado.set(true);
  }

  cancelarBorrado(): void {
    this.confirmandoBorrado.set(false);
  }

  async confirmarBorrado(): Promise<void> {
    this.borrando.set(true);
    this.errorAccion.set(null);
    try {
      await firstValueFrom(this.guiones.eliminar(this.id));
      await this.router.navigate(['/guiones']);
    } catch (error) {
      this.errorAccion.set(this.mensajeDeError(error));
      this.confirmandoBorrado.set(false);
    } finally {
      this.borrando.set(false);
    }
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'ACCESO_DENEGADO') {
        return 'No tienes acceso a este guión.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'Este guión ya no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo eliminar el guión. Inténtalo de nuevo.';
  }
}
