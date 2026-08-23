import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CrearEntrevistaRequest, RespuestaEntrevista } from '../../../../core/api/entrevista.model';
import { ErrorApi } from '../../../../core/api/error-api.model';
import { Pregunta } from '../../../../core/api/guion.model';
import { FilaCita, aRequests } from '../citas';
import { catalogosDeIdea } from '../catalogos';
import { EditorCitas } from '../editor-citas/editor-citas';
import { EntrevistasService } from '../entrevistas.service';

/** Una pregunta del guión elegido junto a la respuesta que se está capturando. */
interface FilaRespuesta {
  pregunta: Pregunta;
  texto: string;
}

/**
 * Alta de entrevista. **Componente aparte de la edición** a propósito: aquí se
 * eligen contacto y guión, y los campos del formulario los **deriva el guión
 * elegido**; en la edición ninguna de las dos cosas es posible.
 *
 * El guión no es un campo más: es el **esquema** del formulario. De ahí que cambiarlo
 * con respuestas ya escritas exija confirmación, porque no hay correspondencia posible
 * entre las preguntas de dos guiones distintos.
 */
@Component({
  selector: 'app-alta-entrevista',
  imports: [RouterLink, EditorCitas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alta.html',
  styleUrls: ['../../../../shared/dominio.css', '../entrevistas.css'],
})
export class AltaEntrevista {
  private readonly entrevistas = inject(EntrevistasService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';
  protected readonly catalogos = catalogosDeIdea(this.ideaId);

  protected readonly contactoId = signal('');
  protected readonly guionId = signal('');
  protected readonly respuestas = signal<FilaRespuesta[]>([]);
  protected readonly citas = signal<FilaCita[]>([]);

  /** Guión pendiente de confirmar, cuando el cambio destruiría respuestas escritas. */
  protected readonly guionPorConfirmar = signal<string | null>(null);

  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly erroresCampo = signal<Record<string, string>>({});

  protected readonly sinEntrevistables = computed(
    () => !this.catalogos.cargando() && this.catalogos.entrevistables().length === 0,
  );

  private readonly hayRespuestasEscritas = computed(() =>
    this.respuestas().some((f) => f.texto.trim()),
  );

  protected readonly puedeGuardar = computed(
    () =>
      !!this.contactoId() && !!this.guionId() && this.hayRespuestasEscritas() && !this.enviando(),
  );

  cambiarContacto(valor: string): void {
    this.contactoId.set(valor);
  }

  /**
   * Cambiar de guión sustituye las preguntas, así que destruye lo escrito. Solo se
   * confirma cuando hay algo que perder: confirmar por confirmar entrena a ignorar
   * los avisos.
   */
  cambiarGuion(valor: string): void {
    if (this.hayRespuestasEscritas() && valor !== this.guionId()) {
      this.guionPorConfirmar.set(valor);
      return;
    }
    this.aplicarGuion(valor);
  }

  confirmarCambioDeGuion(): void {
    const pendiente = this.guionPorConfirmar();
    if (pendiente !== null) {
      this.aplicarGuion(pendiente);
    }
    this.guionPorConfirmar.set(null);
  }

  cancelarCambioDeGuion(): void {
    this.guionPorConfirmar.set(null);
  }

  private aplicarGuion(idGuion: string): void {
    this.guionId.set(idGuion);
    const guion = this.catalogos.guiones().find((g) => g.id === idGuion);
    const preguntas = [...(guion?.preguntas ?? [])].sort((a, b) => a.orden - b.orden);
    this.respuestas.set(preguntas.map((pregunta) => ({ pregunta, texto: '' })));
  }

  cambiarRespuesta(preguntaId: string, texto: string): void {
    this.respuestas.update((filas) =>
      filas.map((fila) => (fila.pregunta.id === preguntaId ? { ...fila, texto } : fila)),
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.puedeGuardar()) {
      return;
    }
    this.errorGeneral.set(null);
    this.erroresCampo.set({});
    this.enviando.set(true);
    try {
      const creada = await firstValueFrom(this.entrevistas.crear(this.ideaId, this.payload()));
      await this.router.navigate(['/ideas', this.ideaId, 'entrevistas', creada.id]);
    } catch (error) {
      this.aplicarError(error);
    } finally {
      this.enviando.set(false);
    }
  }

  /** El cuerpo no lleva `ideaId` (va en el path), ni `ownerId`, ni `score`. */
  private payload(): CrearEntrevistaRequest {
    const respuestas: RespuestaEntrevista[] = this.respuestas()
      .filter((fila) => fila.texto.trim())
      .map((fila) => ({ preguntaId: fila.pregunta.id, texto: fila.texto.trim() }));

    const cuerpo: CrearEntrevistaRequest = {
      contactoId: this.contactoId(),
      guionId: this.guionId(),
      respuestas,
    };
    const citas = aRequests(this.citas());
    if (citas.length) {
      cuerpo.citas = citas;
    }
    return cuerpo;
  }

  private aplicarError(error: unknown): void {
    if (
      error instanceof ErrorApi &&
      error.codigo === 'VALIDACION_FALLIDA' &&
      error.detalles?.length
    ) {
      const porCampo: Record<string, string> = {};
      for (const detalle of error.detalles) {
        porCampo[detalle.campo] = detalle.problema;
      }
      this.erroresCampo.set(porCampo);
      return;
    }
    this.errorGeneral.set(this.mensajeDeError(error));
  }

  /** Los dos errores propios del tag se explican como reglas, no como fallos. */
  private mensajeDeError(error: unknown): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'ENTREVISTA_SIN_VINCULO') {
        return 'Ese contacto no pertenece a esta idea, así que no puede vincularse a la entrevista.';
      }
      if (error.codigo === 'CONFLICTO') {
        return 'Ese contacto ya fue entrevistado o está descartado, así que no admite una entrevista nueva.';
      }
      if (error.codigo === 'ACCESO_DENEGADO') {
        return 'No tienes acceso a esta idea.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'Esta idea no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo registrar la entrevista. Inténtalo de nuevo.';
  }
}
