import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  ActualizarEntrevistaRequest,
  RespuestaEntrevista,
} from '../../../../core/api/entrevista.model';
import { ErrorApi } from '../../../../core/api/error-api.model';
import { Pregunta } from '../../../../core/api/guion.model';
import { GuionesService } from '../../../guiones/guiones.service';
import { FilaCita, aRequests, filasDesde } from '../citas';
import { EditorCitas } from '../editor-citas/editor-citas';
import { EntrevistasService } from '../entrevistas.service';

interface FilaRespuesta {
  pregunta: Pregunta;
  texto: string;
}

/**
 * Edición de una entrevista. **Componente aparte del alta**: el contrato no permite
 * cambiar `contactoId` ni `guionId`, así que aquí no hay selectores y el conjunto de
 * preguntas está fijado por el guión con el que se registró.
 *
 * Cambiar las respuestas invalida el score del agente y re-dispara el scoring. Es una
 * consecuencia cara —se descarta un juicio ya emitido y se gasta una llamada al
 * proveedor— así que se avisa **antes** de guardar, y solo cuando alguna respuesta
 * cambió de verdad: tocar solo las citas no invalida nada.
 */
@Component({
  selector: 'app-edicion-entrevista',
  imports: [RouterLink, EditorCitas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edicion.html',
  styleUrls: ['../../../../shared/dominio.css', '../entrevistas.css'],
})
export class EdicionEntrevista {
  private readonly entrevistas = inject(EntrevistasService);
  private readonly guiones = inject(GuionesService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';
  protected readonly id = this.ruta.snapshot.paramMap.get('idEntrevista') ?? '';

  protected readonly respuestas = signal<FilaRespuesta[]>([]);
  protected readonly citas = signal<FilaCita[]>([]);
  protected readonly nombreGuion = signal('');

  /** Respuestas tal como se cargaron, para saber si alguna cambió. */
  private readonly respuestasOriginales = signal<Map<string, string>>(new Map());

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly erroresCampo = signal<Record<string, string>>({});

  /** Solo lo que invalida el score: un cambio en las citas no cuenta. */
  protected readonly hayRespuestasCambiadas = computed(() => {
    const originales = this.respuestasOriginales();
    return this.respuestas().some(
      (fila) => (originales.get(fila.pregunta.id) ?? '') !== fila.texto,
    );
  });

  protected readonly puedeGuardar = computed(
    () => !this.enviando() && this.respuestas().some((f) => f.texto.trim()),
  );

  constructor() {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const entrevista = await firstValueFrom(this.entrevistas.consultar(this.ideaId, this.id));
      const guion = await firstValueFrom(this.guiones.consultar(entrevista.guionId));
      this.nombreGuion.set(guion.nombre);

      const porTexto = new Map(entrevista.respuestas.map((r) => [r.preguntaId, r.texto] as const));
      const filas = [...guion.preguntas]
        .sort((a, b) => a.orden - b.orden)
        .map((pregunta) => ({ pregunta, texto: porTexto.get(pregunta.id) ?? '' }));

      this.respuestas.set(filas);
      this.respuestasOriginales.set(new Map(filas.map((f) => [f.pregunta.id, f.texto] as const)));
      this.citas.set(filasDesde(entrevista.citas));
    } catch (error) {
      this.errorGeneral.set(this.mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
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
      await firstValueFrom(this.entrevistas.editar(this.ideaId, this.id, this.payload()));
      await this.router.navigate(['/ideas', this.ideaId, 'entrevistas', this.id]);
    } catch (error) {
      this.aplicarError(error);
    } finally {
      this.enviando.set(false);
    }
  }

  /** No lleva `contactoId` ni `guionId`: el contrato no los admite al editar. */
  private payload(): ActualizarEntrevistaRequest {
    const respuestas: RespuestaEntrevista[] = this.respuestas()
      .filter((fila) => fila.texto.trim())
      .map((fila) => ({ preguntaId: fila.pregunta.id, texto: fila.texto.trim() }));

    return { respuestas, citas: aRequests(this.citas()) };
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
        return 'No tienes acceso a esta entrevista.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'Esta entrevista no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo guardar la entrevista. Inténtalo de nuevo.';
  }
}
