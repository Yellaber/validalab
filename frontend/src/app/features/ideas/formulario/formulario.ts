import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import { ActualizarIdeaRequest, CrearIdeaRequest } from '../../../core/api/idea.model';
import { IdeasService } from '../ideas.service';

/** Modelo del formulario de idea (contenido; nunca el `estado`). */
interface ModeloIdea {
  titulo: string;
  descripcion: string;
  problema: string;
  segmentoBeachhead: string;
}

/**
 * Formulario de idea reutilizado por alta y edición (Signal Forms). En alta parte
 * vacío y hace `POST /ideas`; en edición carga la idea por su `id` y hace
 * `PATCH /ideas/{id}`. NO expone control de `estado`: las transiciones de veredicto
 * (`go`/`pivote`/`kill`) provienen de E6. Los errores `VALIDACION_FALLIDA` del
 * backend se muestran campo a campo desde `detalles`.
 */
@Component({
  selector: 'app-formulario-idea',
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario.html',
  styleUrl: '../ideas.css',
})
export class FormularioIdea {
  private readonly ideas = inject(IdeasService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly id = this.ruta.snapshot.paramMap.get('id');
  protected readonly modoEdicion = this.id !== null;

  protected readonly modelo = signal<ModeloIdea>({
    titulo: '',
    descripcion: '',
    problema: '',
    segmentoBeachhead: '',
  });
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.titulo, { message: 'El título es obligatorio' });
    required(ruta.problema, { message: 'El problema es obligatorio' });
  });

  protected readonly cargando = signal(this.modoEdicion);
  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly erroresCampo = signal<Record<string, string>>({});

  constructor() {
    if (this.id) {
      void this.cargarIdea(this.id);
    }
  }

  private async cargarIdea(id: string): Promise<void> {
    this.cargando.set(true);
    try {
      const idea = await firstValueFrom(this.ideas.consultar(id));
      this.modelo.set({
        titulo: idea.titulo,
        descripcion: idea.descripcion ?? '',
        problema: idea.problema,
        segmentoBeachhead: idea.segmentoBeachhead ?? '',
      });
    } catch (error) {
      this.errorGeneral.set(this.mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  onSubmit(): void {
    this.errorGeneral.set(null);
    this.erroresCampo.set({});
    void submit(this.formulario, async () => {
      this.enviando.set(true);
      try {
        if (this.id) {
          await firstValueFrom(this.ideas.editar(this.id, this.payload()));
          await this.router.navigate(['/ideas', this.id]);
        } else {
          const creada = await firstValueFrom(this.ideas.crear(this.payload() as CrearIdeaRequest));
          await this.router.navigate(['/ideas', creada.id]);
        }
      } catch (error) {
        this.aplicarError(error);
      } finally {
        this.enviando.set(false);
      }
    });
  }

  /** Construye el cuerpo omitiendo los opcionales vacíos; `titulo`/`problema` siempre. */
  private payload(): CrearIdeaRequest & ActualizarIdeaRequest {
    const { titulo, problema, descripcion, segmentoBeachhead } = this.modelo();
    const cuerpo: CrearIdeaRequest & ActualizarIdeaRequest = { titulo, problema };
    if (descripcion.trim()) {
      cuerpo.descripcion = descripcion;
    }
    if (segmentoBeachhead.trim()) {
      cuerpo.segmentoBeachhead = segmentoBeachhead;
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

  private mensajeDeError(error: unknown): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'ACCESO_DENEGADO') {
        return 'No tienes acceso a esta idea.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'La idea no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return this.modoEdicion
      ? 'No se pudo guardar la idea. Inténtalo de nuevo.'
      : 'No se pudo crear la idea. Inténtalo de nuevo.';
  }
}
