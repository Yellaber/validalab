import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Entrevista } from '../../../../core/api/entrevista.model';
import { ErrorApi } from '../../../../core/api/error-api.model';
import { Guion } from '../../../../core/api/guion.model';
import { GuionesService } from '../../../guiones/guiones.service';
import { catalogosDeIdea } from '../catalogos';
import { EntrevistasService } from '../entrevistas.service';
import { ETIQUETA_ESTADO_SCORING } from '../etiquetas';

/** Respuesta ya emparejada con la pregunta que contesta. */
interface RespuestaLegible {
  enunciado: string;
  texto: string;
}

/**
 * Detalle de una entrevista: contacto, guión, cada respuesta **junto al texto de su
 * pregunta**, las citas y el estado del scoring.
 *
 * El guión se pide aparte porque `Entrevista` solo trae `guionId` y sin las preguntas
 * las respuestas son ilegibles. Ese guión **siempre existe**: el contrato impide
 * eliminar un guión que alguna entrevista referencie.
 *
 * El bloque `score` y el `ajuste` no se renderizan aquí: son del change de scoring.
 */
@Component({
  selector: 'app-detalle-entrevista',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle.html',
  styleUrls: ['../../../../shared/dominio.css', '../entrevistas.css'],
})
export class DetalleEntrevista {
  private readonly entrevistas = inject(EntrevistasService);
  private readonly guiones = inject(GuionesService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';
  protected readonly id = this.ruta.snapshot.paramMap.get('idEntrevista') ?? '';
  protected readonly catalogos = catalogosDeIdea(this.ideaId);

  protected readonly etiquetaEstado = ETIQUETA_ESTADO_SCORING;

  protected readonly recurso = httpResource<Entrevista>(() =>
    this.entrevistas.solicitudDetalle(this.ideaId, this.id),
  );

  protected readonly entrevista = computed(() => this.recurso.value());

  /** Se pide en cuanto se conoce el `guionId`; antes, el recurso queda inactivo. */
  private readonly recursoGuion = httpResource<Guion>(() => {
    const guionId = this.entrevista()?.guionId;
    return guionId ? this.guiones.solicitudDetalle(guionId) : undefined;
  });

  protected readonly cargando = computed(
    () => this.recurso.isLoading() || this.recursoGuion.isLoading(),
  );

  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi
      ? e
      : new ErrorApi('ERROR_RED', 'No se pudo cargar la entrevista.');
  });

  protected readonly nombreContacto = computed(() => {
    const e = this.entrevista();
    return e ? this.catalogos.nombreContacto()(e.contactoId) : '';
  });

  protected readonly nombreGuion = computed(() => this.recursoGuion.value()?.nombre ?? '');

  /** Empareja cada respuesta con su pregunta, en el orden del guión. */
  protected readonly respuestas = computed<RespuestaLegible[]>(() => {
    const e = this.entrevista();
    const guion = this.recursoGuion.value();
    if (!e || !guion) {
      return [];
    }
    const porTexto = new Map(e.respuestas.map((r) => [r.preguntaId, r.texto] as const));
    return [...guion.preguntas]
      .sort((a, b) => a.orden - b.orden)
      .filter((pregunta) => porTexto.has(pregunta.id))
      .map((pregunta) => ({
        enunciado: pregunta.texto,
        texto: porTexto.get(pregunta.id) ?? '',
      }));
  });

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
      await firstValueFrom(this.entrevistas.eliminar(this.ideaId, this.id));
      await this.router.navigate(['/ideas', this.ideaId, 'entrevistas']);
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
        return 'No tienes acceso a esta entrevista.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'Esta entrevista ya no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo eliminar la entrevista. Inténtalo de nuevo.';
  }
}
