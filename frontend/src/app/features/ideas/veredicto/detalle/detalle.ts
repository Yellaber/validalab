import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../../core/api/error-api.model';
import { KpiCalculado } from '../../../../core/api/kpi.model';
import { Veredicto } from '../../../../core/api/veredicto.model';
import { nombreKpi } from '../../umbrales/catalogo-kpi';
import { etiquetaValor } from '../../umbrales/unidad-kpi';
import { ETIQUETA_ESTADO_VEREDICTO, ETIQUETA_TIPO_VEREDICTO } from '../etiquetas';
import { VeredictoService } from '../veredicto.service';

/** KPI del snapshot ya formateado para la plantilla. */
interface FilaSnapshot {
  nombre: string;
  zona: KpiCalculado['zona'];
  valor: string;
  sinDatos: boolean;
}

/** Justificación del agente con el nombre legible del KPI. */
interface FilaJustificacion {
  nombre: string;
  lectura: string;
}

/**
 * Detalle de un veredicto: el juicio del agente, su razonamiento por KPI, sus
 * recomendaciones, el snapshot de KPIs congelado y la **verificación humana**.
 *
 * El gobierno consultivo (RF-16) vive aquí: mientras está `pendiente`, el usuario
 * puede **aprobarlo** —lo hace firme y cambia el estado de la idea— o **anularlo**
 * con una nota, sin cambiar la idea. Se conservan siempre ambas versiones.
 */
@Component({
  selector: 'app-detalle-veredicto',
  imports: [RouterLink, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle.html',
  styleUrls: ['../../../../shared/dominio.css'],
})
export class DetalleVeredicto {
  private readonly veredictos = inject(VeredictoService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';
  protected readonly id = this.ruta.snapshot.paramMap.get('idVeredicto') ?? '';

  protected readonly etiquetaTipo = ETIQUETA_TIPO_VEREDICTO;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO_VEREDICTO;

  protected readonly recurso = httpResource<Veredicto>(() =>
    this.veredictos.solicitudDetalle(this.ideaId, this.id),
  );

  protected readonly veredicto = computed(() =>
    this.recurso.hasValue() ? this.recurso.value() : undefined,
  );

  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi
      ? e
      : new ErrorApi('ERROR_RED', 'No se pudo cargar el veredicto.');
  });

  protected readonly pendiente = computed(
    () => this.veredicto()?.estadoVerificacion === 'pendiente',
  );

  protected readonly justificaciones = computed<FilaJustificacion[]>(() =>
    (this.veredicto()?.justificacionPorKPI ?? []).map((j) => ({
      nombre: nombreKpi(j.kpi),
      lectura: j.lectura,
    })),
  );

  protected readonly snapshot = computed<FilaSnapshot[]>(() =>
    (this.veredicto()?.snapshotKpis ?? []).map((kpi) => ({
      nombre: nombreKpi(kpi.kpi),
      zona: kpi.zona,
      valor: etiquetaValor(kpi.valor, kpi.unidad),
      sinDatos: kpi.valor === null,
    })),
  );

  protected readonly verificando = signal(false);
  protected readonly errorAccion = signal<string | null>(null);
  protected readonly formularioAnularAbierto = signal(false);

  protected readonly modeloAnular = signal({ nota: '' });
  protected readonly formularioAnular = form(this.modeloAnular, (ruta) => {
    validate(ruta.nota, ({ value }) =>
      value().trim()
        ? undefined
        : { kind: 'requerido', message: 'Explica por qué anulas el veredicto' },
    );
  });
  protected readonly errorNota = signal<string | null>(null);

  reintentar(): void {
    this.recurso.reload();
  }

  /** Aprueba el veredicto: queda firme y la idea cambia a su estado. */
  async aprobar(): Promise<void> {
    this.verificando.set(true);
    this.errorAccion.set(null);
    try {
      await firstValueFrom(
        this.veredictos.verificar(this.ideaId, this.id, { resultado: 'aprobado' }),
      );
      this.recurso.reload();
    } catch (error) {
      this.errorAccion.set(this.mensajeDeError(error));
    } finally {
      this.verificando.set(false);
    }
  }

  abrirAnular(): void {
    this.errorNota.set(null);
    this.errorAccion.set(null);
    this.modeloAnular.set({ nota: '' });
    this.formularioAnularAbierto.set(true);
  }

  cerrarAnular(): void {
    this.formularioAnularAbierto.set(false);
  }

  onSubmitAnular(): void {
    this.errorAccion.set(null);
    this.errorNota.set(null);
    void submit(this.formularioAnular, async () => {
      this.verificando.set(true);
      try {
        const { nota } = this.modeloAnular();
        await firstValueFrom(
          this.veredictos.verificar(this.ideaId, this.id, { resultado: 'anulado', nota }),
        );
        this.formularioAnularAbierto.set(false);
        this.recurso.reload();
      } catch (error) {
        this.aplicarErrorAnular(error);
      } finally {
        this.verificando.set(false);
      }
    });
  }

  private aplicarErrorAnular(error: unknown): void {
    if (
      error instanceof ErrorApi &&
      error.codigo === 'VALIDACION_FALLIDA' &&
      error.detalles?.length
    ) {
      const nota = error.detalles.find((d) => d.campo === 'nota');
      this.errorNota.set(nota ? nota.problema : error.detalles[0].problema);
      return;
    }
    this.errorAccion.set(this.mensajeDeError(error));
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'CONFLICTO') {
        return 'Este veredicto ya fue verificado.';
      }
      if (error.codigo === 'ACCESO_DENEGADO') {
        return 'No tienes acceso a este veredicto.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'Este veredicto ya no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo verificar el veredicto. Inténtalo de nuevo.';
  }
}
