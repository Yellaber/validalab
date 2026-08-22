import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, schema, submit } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import {
  ActualizarHipotesisRequest,
  EstadoHipotesis,
  Hipotesis,
  TipoHipotesis,
} from '../../../core/api/hipotesis.model';
import {
  ACCION_ESTADO,
  AYUDA_TIPO,
  ESTADOS_HIPOTESIS,
  ETIQUETA_ESTADO_HIPOTESIS,
  ETIQUETA_TIPO,
  TIPOS_HIPOTESIS,
} from './etiquetas-hipotesis';
import { HipotesisService } from './hipotesis.service';

/** Modelo del formulario de hipótesis. Nunca modela el `estado`. */
interface ModeloHipotesis {
  tipo: TipoHipotesis;
  enunciado: string;
}

/**
 * Esquema compartido por el alta y la edición inline: el `enunciado` es
 * obligatorio y el `tipo` se elige del catálogo del contrato.
 */
const esquemaHipotesis = schema<ModeloHipotesis>((ruta) => {
  required(ruta.enunciado, { message: 'El enunciado es obligatorio' });
});

/**
 * Hipótesis de una idea propia (E2). Carga con `httpResource` sobre la colección
 * anidada —arreglo plano, sin paginar— y ofrece alta, edición inline, marcado
 * manual del estado de aprendizaje y eliminación con confirmación en línea.
 *
 * El marcado `confirmada`/`refutada` es una **anotación del usuario**: ni el
 * sistema ni el agente lo determinan aquí. Los errores se ramifican por el
 * `codigo` estable del `ErrorApi`, nunca por el `mensaje`.
 */
@Component({
  selector: 'app-hipotesis-idea',
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hipotesis.html',
  styleUrls: ['../../../shared/dominio.css', './hipotesis.css'],
})
export class HipotesisIdea {
  private readonly hipotesis = inject(HipotesisService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';

  protected readonly tipos = TIPOS_HIPOTESIS;
  protected readonly estados = ESTADOS_HIPOTESIS;
  protected readonly etiquetaTipo = ETIQUETA_TIPO;
  protected readonly ayudaTipo = AYUDA_TIPO;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO_HIPOTESIS;
  protected readonly accionEstado = ACCION_ESTADO;

  protected readonly recurso = httpResource<Hipotesis[]>(() =>
    this.hipotesis.solicitudLista(this.ideaId),
  );

  protected readonly lista = computed(() => this.recurso.value() ?? []);
  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi ? e : new ErrorApi('ERROR_RED', 'No se pudieron cargar.');
  });
  protected readonly vacio = computed(
    () => !this.cargando() && !this.error() && this.lista().length === 0,
  );

  // --- Alta ---
  protected readonly modeloAlta = signal<ModeloHipotesis>({ tipo: 'problema', enunciado: '' });
  protected readonly formularioAlta = form(this.modeloAlta, esquemaHipotesis);
  protected readonly creando = signal(false);
  protected readonly errorAlta = signal<string | null>(null);
  protected readonly erroresCampoAlta = signal<Record<string, string>>({});

  // --- Edición inline ---
  protected readonly editandoId = signal<string | null>(null);
  protected readonly modeloEdicion = signal<ModeloHipotesis>({ tipo: 'problema', enunciado: '' });
  protected readonly formularioEdicion = form(this.modeloEdicion, esquemaHipotesis);
  protected readonly editando = signal(false);
  protected readonly errorEdicion = signal<string | null>(null);
  protected readonly erroresCampoEdicion = signal<Record<string, string>>({});

  // --- Marcado de estado y eliminación ---
  protected readonly accionEnCursoId = signal<string | null>(null);
  protected readonly confirmandoId = signal<string | null>(null);
  protected readonly errorAccion = signal<string | null>(null);

  reintentar(): void {
    this.recurso.reload();
  }

  crear(): void {
    this.errorAlta.set(null);
    this.erroresCampoAlta.set({});
    void submit(this.formularioAlta, async () => {
      this.creando.set(true);
      try {
        const { tipo, enunciado } = this.modeloAlta();
        await firstValueFrom(this.hipotesis.crear(this.ideaId, { tipo, enunciado }));
        this.modeloAlta.set({ tipo, enunciado: '' });
        this.recurso.reload();
      } catch (error) {
        this.aplicarError(error, this.errorAlta, this.erroresCampoAlta, 'crear');
      } finally {
        this.creando.set(false);
      }
    });
  }

  iniciarEdicion(h: Hipotesis): void {
    this.errorEdicion.set(null);
    this.erroresCampoEdicion.set({});
    this.confirmandoId.set(null);
    this.modeloEdicion.set({ tipo: h.tipo, enunciado: h.enunciado });
    this.editandoId.set(h.id);
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  guardarEdicion(): void {
    const id = this.editandoId();
    if (!id) {
      return;
    }
    this.errorEdicion.set(null);
    this.erroresCampoEdicion.set({});
    void submit(this.formularioEdicion, async () => {
      this.editando.set(true);
      try {
        const { tipo, enunciado } = this.modeloEdicion();
        await firstValueFrom(this.hipotesis.actualizar(this.ideaId, id, { tipo, enunciado }));
        this.editandoId.set(null);
        this.recurso.reload();
      } catch (error) {
        this.aplicarError(error, this.errorEdicion, this.erroresCampoEdicion, 'guardar');
        this.refrescarSiDesapareció(error);
      } finally {
        this.editando.set(false);
      }
    });
  }

  /** Marcado manual del estado de aprendizaje: `PATCH` con solo el `estado`. */
  marcar(h: Hipotesis, estado: EstadoHipotesis): void {
    void this.ejecutar(h.id, { estado });
  }

  pedirEliminar(id: string): void {
    this.errorAccion.set(null);
    this.editandoId.set(null);
    this.confirmandoId.set(id);
  }

  cancelarEliminar(): void {
    this.confirmandoId.set(null);
  }

  async confirmarEliminar(id: string): Promise<void> {
    this.errorAccion.set(null);
    this.accionEnCursoId.set(id);
    try {
      await firstValueFrom(this.hipotesis.eliminar(this.ideaId, id));
      this.confirmandoId.set(null);
      this.recurso.reload();
    } catch (error) {
      this.errorAccion.set(this.mensajeDeError(error, 'eliminar'));
      this.refrescarSiDesapareció(error);
    } finally {
      this.accionEnCursoId.set(null);
    }
  }

  private async ejecutar(id: string, cambios: ActualizarHipotesisRequest): Promise<void> {
    this.errorAccion.set(null);
    this.accionEnCursoId.set(id);
    try {
      await firstValueFrom(this.hipotesis.actualizar(this.ideaId, id, cambios));
      this.recurso.reload();
    } catch (error) {
      this.errorAccion.set(this.mensajeDeError(error, 'guardar'));
      this.refrescarSiDesapareció(error);
    } finally {
      this.accionEnCursoId.set(null);
    }
  }

  /**
   * Una hipótesis que ya no existe (`404`) deja la lista obsoleta: se recarga para
   * que la vista deje de ofrecer acciones sobre algo que desapareció. El aviso sube
   * al nivel de página (`errorAccion`), porque el formulario de edición se cierra y
   * la recarga taparía un mensaje anclado a la fila.
   */
  private refrescarSiDesapareció(error: unknown): void {
    if (error instanceof ErrorApi && error.codigo === 'RECURSO_NO_ENCONTRADO') {
      this.errorAccion.set('Esta hipótesis ya no existe.');
      this.editandoId.set(null);
      this.recurso.reload();
    }
  }

  /** Un `422` se reparte campo a campo desde `detalles`; el resto va al aviso general. */
  private aplicarError(
    error: unknown,
    destinoGeneral: { set(valor: string | null): void },
    destinoCampos: { set(valor: Record<string, string>): void },
    verbo: string,
  ): void {
    if (
      error instanceof ErrorApi &&
      error.codigo === 'VALIDACION_FALLIDA' &&
      error.detalles?.length
    ) {
      const porCampo: Record<string, string> = {};
      for (const detalle of error.detalles) {
        porCampo[detalle.campo] = detalle.problema;
      }
      destinoCampos.set(porCampo);
      return;
    }
    destinoGeneral.set(this.mensajeDeError(error, verbo));
  }

  private mensajeDeError(error: unknown, verbo: string): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'ACCESO_DENEGADO') {
        return 'No tienes acceso a esta idea.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'Esta hipótesis ya no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return `No se pudo ${verbo} la hipótesis. Inténtalo de nuevo.`;
  }
}
