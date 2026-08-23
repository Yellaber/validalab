import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../../core/api/error-api.model';
import { AlertaKpi, TableroIdea } from '../../../../core/api/kpi.model';
import { RespuestaPaginada } from '../../../../core/api/paginacion.model';
import { nombreKpi } from '../../umbrales/catalogo-kpi';
import { etiquetaValor } from '../../umbrales/unidad-kpi';
import { TableroService } from '../tablero.service';

/** Alerta ya formateada para la plantilla. */
interface FilaAlerta {
  alerta: AlertaKpi;
  nombre: string;
  valor: string;
  umbral: string;
}

/**
 * Alertas de cruce de umbral de una idea.
 *
 * Separadas del tablero a propósito: el tablero es **el estado actual**, esto es el
 * historial de **cruces ocurridos**. Mezclarlos haría que el historial compitiera con
 * la foto.
 *
 * Las alertas las genera el sistema: aquí solo se listan, se filtran y se marcan
 * leídas.
 */
@Component({
  selector: 'app-alertas-kpi',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alertas.html',
  styleUrls: ['../../../../shared/dominio.css', '../tablero.css'],
})
export class AlertasKpi {
  private readonly tablero = inject(TableroService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';

  protected readonly pagina = signal(1);
  protected readonly porPagina = signal(20);
  /** `''` es «todas»; el contrato filtra por un booleano. */
  protected readonly filtroLeida = signal<'' | 'true' | 'false'>('');

  protected readonly marcando = signal<string | null>(null);
  protected readonly errorAccion = signal<string | null>(null);

  protected readonly recurso = httpResource<RespuestaPaginada<AlertaKpi>>(() =>
    this.tablero.solicitudAlertas(this.ideaId, {
      pagina: this.pagina(),
      porPagina: this.porPagina(),
      leida: this.filtroLeida() === '' ? undefined : this.filtroLeida() === 'true',
    }),
  );

  /**
   * `AlertaKpi` **no trae la unidad** del KPI, y el catálogo local no la guarda a
   * propósito (E2 decidió leer siempre la correspondencia KPI→unidad de la respuesta
   * del contrato). Se resuelve pidiendo el tablero de la misma idea, que sí la trae
   * por KPI: una petición extra, pero autoritativa.
   *
   * La alternativa —deducirla del nombre del KPI— reintroduciría justo el
   * conocimiento local que E2 evitó, y se rompería con el primer KPI nuevo.
   */
  private readonly recursoTablero = httpResource<TableroIdea>(() =>
    this.tablero.solicitudTablero(this.ideaId),
  );

  private readonly unidadPorKpi = computed(() => {
    const kpis = this.recursoTablero.hasValue() ? this.recursoTablero.value().kpis : [];
    return new Map(kpis.map((k) => [k.kpi as string, k.unidad as string] as const));
  });

  /**
   * El valor y el umbral se formatean con la unidad del KPI, igual que en el tablero:
   * una alerta que dijera «0.05» donde el tablero dice «5%» sería la misma
   * incoherencia que corrigió el PR #48.
   */
  protected readonly filas = computed<FilaAlerta[]>(() => {
    const unidades = this.unidadPorKpi();
    return (this.recurso.value()?.datos ?? []).map((alerta) => {
      // Sin unidad conocida se degrada a `ratio`, el formato más permisivo.
      const unidad = unidades.get(alerta.kpi) ?? 'ratio';
      return {
        alerta,
        nombre: nombreKpi(alerta.kpi),
        valor: etiquetaValor(alerta.valor, unidad),
        umbral: etiquetaValor(alerta.umbral, unidad),
      };
    });
  });

  protected readonly paginacion = computed(() => this.recurso.value()?.paginacion);
  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi ? e : new ErrorApi('ERROR_RED', 'No se pudieron cargar.');
  });
  protected readonly vacio = computed(
    () => !this.cargando() && !this.error() && this.filas().length === 0,
  );

  cambiarFiltro(valor: string): void {
    this.filtroLeida.set(valor as '' | 'true' | 'false');
    this.pagina.set(1);
  }

  paginaAnterior(): void {
    if (this.pagina() > 1) {
      this.pagina.update((p) => p - 1);
    }
  }

  paginaSiguiente(): void {
    const total = this.paginacion()?.totalPaginas ?? 1;
    if (this.pagina() < total) {
      this.pagina.update((p) => p + 1);
    }
  }

  /** Sin estado optimista: con el filtro activo, la fila podría dejar de aplicar. */
  async marcarLeida(idAlerta: string): Promise<void> {
    this.marcando.set(idAlerta);
    this.errorAccion.set(null);
    try {
      await firstValueFrom(this.tablero.marcarLeida(this.ideaId, idAlerta));
      this.recurso.reload();
    } catch (error) {
      this.errorAccion.set(this.mensajeDeError(error));
    } finally {
      this.marcando.set(null);
    }
  }

  reintentar(): void {
    this.recurso.reload();
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'ACCESO_DENEGADO') {
        return 'No tienes acceso a esta alerta.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'Esta alerta ya no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo marcar la alerta. Inténtalo de nuevo.';
  }
}
