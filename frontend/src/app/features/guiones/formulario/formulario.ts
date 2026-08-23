import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, applyEach, form, required, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import { ActualizarGuionRequest, CrearGuionRequest } from '../../../core/api/guion.model';
import { GuionesService } from '../guiones.service';
import { FilaPregunta, aRequests, filaNueva, filasDesde, moverFila } from '../preguntas';

/** Modelo del formulario. Las preguntas viven **dentro**, con su validación por fila. */
interface ModeloGuion {
  nombre: string;
  descripcion: string;
  preguntas: FilaPregunta[];
}

/**
 * Formulario de guión reutilizado por alta y edición (Signal Forms). En alta parte de
 * una única pregunta vacía y hace `POST`; en edición carga el guión y hace `PATCH`.
 *
 * Las preguntas son parte del modelo, no un estado aparte: `applyEach` da validación
 * y estado `touched`/`errors` **por fila**, así que un solo `formulario().valid()`
 * cubre el nombre y todas las preguntas.
 *
 * El `orden` nunca se teclea: sale de la posición al construir el cuerpo. Y el `PATCH`
 * envía **siempre el conjunto completo**, porque el contrato lo reemplaza entero.
 */
@Component({
  selector: 'app-formulario-guion',
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario.html',
  styleUrls: ['../../../shared/dominio.css', '../guiones.css'],
})
export class FormularioGuion {
  private readonly guiones = inject(GuionesService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly id = this.ruta.snapshot.paramMap.get('idGuion');
  protected readonly modoEdicion = this.id !== null;

  protected readonly modelo = signal<ModeloGuion>({
    nombre: '',
    descripcion: '',
    // El contrato exige al menos una pregunta, así que el alta ya arranca con una.
    preguntas: [filaNueva()],
  });

  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.nombre, { message: 'El nombre es obligatorio' });
    applyEach(ruta.preguntas, (pregunta) => {
      validate(pregunta.texto, ({ value }) =>
        value().trim()
          ? undefined
          : { kind: 'requerido', message: 'La pregunta no puede estar vacía' },
      );
    });
  });

  /** Con una sola pregunta no se ofrece quitarla: el contrato exige `minItems: 1`. */
  protected readonly puedeQuitar = computed(() => this.modelo().preguntas.length > 1);
  protected readonly totalPreguntas = computed(() => this.modelo().preguntas.length);

  protected readonly cargando = signal(this.modoEdicion);
  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly erroresCampo = signal<Record<string, string>>({});

  constructor() {
    if (this.id) {
      void this.cargarGuion(this.id);
    }
  }

  private async cargarGuion(id: string): Promise<void> {
    this.cargando.set(true);
    try {
      const guion = await firstValueFrom(this.guiones.consultar(id));
      this.modelo.set({
        nombre: guion.nombre,
        descripcion: guion.descripcion ?? '',
        preguntas: filasDesde(guion.preguntas),
      });
    } catch (error) {
      this.errorGeneral.set(this.mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  anadirPregunta(): void {
    this.modelo.update((m) => ({ ...m, preguntas: [...m.preguntas, filaNueva()] }));
  }

  quitarPregunta(indice: number): void {
    if (!this.puedeQuitar()) {
      return;
    }
    this.modelo.update((m) => ({
      ...m,
      preguntas: m.preguntas.filter((_, i) => i !== indice),
    }));
  }

  moverPregunta(indice: number, direccion: -1 | 1): void {
    this.modelo.update((m) => ({ ...m, preguntas: moverFila(m.preguntas, indice, direccion) }));
  }

  onSubmit(): void {
    this.errorGeneral.set(null);
    this.erroresCampo.set({});
    void submit(this.formulario, async () => {
      this.enviando.set(true);
      try {
        if (this.id) {
          await firstValueFrom(this.guiones.editar(this.id, this.payload()));
          await this.router.navigate(['/guiones', this.id]);
        } else {
          const creado = await firstValueFrom(
            this.guiones.crear(this.payload() as CrearGuionRequest),
          );
          await this.router.navigate(['/guiones', creado.id]);
        }
      } catch (error) {
        this.aplicarError(error);
      } finally {
        this.enviando.set(false);
      }
    });
  }

  /**
   * Construye el cuerpo. `preguntas` va **entera** con su `orden` recalculado por
   * posición, aunque el usuario solo haya tocado una: el `PATCH` reemplaza el
   * conjunto, así que enviar un subconjunto borraría el resto.
   */
  private payload(): CrearGuionRequest & ActualizarGuionRequest {
    const { nombre, descripcion, preguntas } = this.modelo();
    const cuerpo: CrearGuionRequest & ActualizarGuionRequest = {
      nombre,
      preguntas: aRequests(preguntas),
    };
    if (descripcion.trim()) {
      cuerpo.descripcion = descripcion;
    }
    return cuerpo;
  }

  /**
   * Error del `422` que corresponde a una fila. El contrato tipa `campo` como texto
   * libre y no fija cómo se indexa un arreglo, así que se aceptan las dos formas
   * habituales (`preguntas[0]…` y `preguntas.0…`) en vez de apostar por una.
   */
  protected errorDeFila(indice: number): string | undefined {
    const errores = this.erroresCampo();
    const prefijos = [`preguntas[${indice}]`, `preguntas.${indice}`];
    const clave = Object.keys(errores).find((campo) =>
      prefijos.some((prefijo) => campo === prefijo || campo.startsWith(`${prefijo}.`)),
    );
    return clave ? errores[clave] : undefined;
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
        return 'No tienes acceso a este guión.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'Este guión no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return this.modoEdicion
      ? 'No se pudo guardar el guión. Inténtalo de nuevo.'
      : 'No se pudo crear el guión. Inténtalo de nuevo.';
  }
}
