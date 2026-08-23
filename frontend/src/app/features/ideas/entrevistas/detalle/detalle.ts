import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormField, form, max, min, required, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Entrevista } from '../../../../core/api/entrevista.model';
import { ErrorApi } from '../../../../core/api/error-api.model';
import { Guion } from '../../../../core/api/guion.model';
import { GuionesService } from '../../../guiones/guiones.service';
import { catalogosDeIdea } from '../catalogos';
import { EntrevistasService } from '../entrevistas.service';
import { ETIQUETA_ESTADO_SCORING } from '../etiquetas';
import { ScoreEntrevistaBloque } from '../score/score';
import { seguimientoScoring } from '../seguimiento-scoring';

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
  imports: [RouterLink, FormField, ScoreEntrevistaBloque],
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

  /**
   * `value()` lanza si el recurso está en error, y el seguimiento lee esto sin pasar
   * antes por la rama de error de la plantilla. Se consulta `hasValue()` para que un
   * `403` o un `404` den `undefined` en vez de reventar.
   */
  protected readonly entrevista = computed(() =>
    this.recurso.hasValue() ? this.recurso.value() : undefined,
  );

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

  // --- Juicio del agente ---

  protected readonly score = computed(() => this.entrevista()?.score ?? null);
  protected readonly ajuste = computed(() => this.entrevista()?.ajuste ?? null);
  protected readonly estadoScoring = computed(() => this.entrevista()?.estadoScoring);
  protected readonly scoringFallido = computed(() => this.estadoScoring() === 'fallida');
  protected readonly scoringEnCurso = computed(
    () => this.estadoScoring() === 'pendiente' || this.estadoScoring() === 'procesando',
  );

  /**
   * Polling acotado: solo mientras el scoring está en curso, con corte. La vista es la
   * única pantalla donde alguien espera *este* resultado.
   */
  protected readonly seguimiento = seguimientoScoring(() => this.recurso.reload());

  protected readonly puntuando = signal(false);
  protected readonly ajustando = signal(false);
  protected readonly formularioAjusteAbierto = signal(false);

  protected readonly modeloAjuste = signal({ scoreAjustado: 0, nota: '' });
  protected readonly formularioAjuste = form(this.modeloAjuste, (ruta) => {
    required(ruta.scoreAjustado, { message: 'Indica el score ajustado' });
    min(ruta.scoreAjustado, 0, { message: 'El score va de 0 a 10' });
    max(ruta.scoreAjustado, 10, { message: 'El score va de 0 a 10' });
    validate(ruta.nota, ({ value }) =>
      value().trim() ? undefined : { kind: 'requerido', message: 'Explica el motivo del ajuste' },
    );
  });
  protected readonly erroresAjuste = signal<Record<string, string>>({});

  constructor() {
    // Cada vez que llegan datos nuevos, el seguimiento decide si seguir preguntando.
    //
    // `untracked` es imprescindible: `sincronizar` lee y escribe sus propios signals
    // internos, así que sin aislarlo el efecto se declararía dependiente de lo que él
    // mismo modifica y se re-dispararía en bucle. La única dependencia real es el
    // estado del scoring.
    effect(() => {
      const estado = this.estadoScoring();
      untracked(() => this.seguimiento.sincronizar(estado));
    });
  }

  reintentar(): void {
    this.recurso.reload();
  }

  /** Refresco manual que se ofrece cuando el seguimiento agotó sus intentos. */
  refrescarManual(): void {
    this.seguimiento.reiniciar();
    this.recurso.reload();
  }

  /**
   * (Re)dispara el scoring. Tras la respuesta el estado vuelve a estar en curso y el
   * seguimiento arranca solo, así que esta acción no lleva lógica de espera propia.
   */
  async puntuar(): Promise<void> {
    this.puntuando.set(true);
    this.errorAccion.set(null);
    try {
      await firstValueFrom(this.entrevistas.puntuar(this.ideaId, this.id));
      this.seguimiento.reiniciar();
      this.recurso.reload();
    } catch (error) {
      this.errorAccion.set(this.mensajeDeError(error));
    } finally {
      this.puntuando.set(false);
    }
  }

  abrirAjuste(): void {
    this.erroresAjuste.set({});
    this.modeloAjuste.set({ scoreAjustado: this.score()?.score ?? 0, nota: '' });
    this.formularioAjusteAbierto.set(true);
  }

  cerrarAjuste(): void {
    this.formularioAjusteAbierto.set(false);
  }

  onSubmitAjuste(): void {
    this.errorAccion.set(null);
    this.erroresAjuste.set({});
    void submit(this.formularioAjuste, async () => {
      this.ajustando.set(true);
      try {
        const { scoreAjustado, nota } = this.modeloAjuste();
        await firstValueFrom(
          this.entrevistas.ajustarScore(this.ideaId, this.id, { scoreAjustado, nota }),
        );
        this.formularioAjusteAbierto.set(false);
        this.recurso.reload();
      } catch (error) {
        this.aplicarErrorAjuste(error);
      } finally {
        this.ajustando.set(false);
      }
    });
  }

  private aplicarErrorAjuste(error: unknown): void {
    if (
      error instanceof ErrorApi &&
      error.codigo === 'VALIDACION_FALLIDA' &&
      error.detalles?.length
    ) {
      const porCampo: Record<string, string> = {};
      for (const detalle of error.detalles) {
        porCampo[detalle.campo] = detalle.problema;
      }
      this.erroresAjuste.set(porCampo);
      return;
    }
    this.errorAccion.set(this.mensajeDeError(error));
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
