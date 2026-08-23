import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ErrorApi } from '../../../../core/api/error-api.model';
import { KpiCalculado, TableroIdea } from '../../../../core/api/kpi.model';
import {
  ORDEN_GRUPOS,
  contextoGrupo,
  formulaKpi,
  nombreGrupo,
  nombreKpi,
} from '../../umbrales/catalogo-kpi';
import { etiquetaValor } from '../../umbrales/unidad-kpi';
import { TableroService } from '../tablero.service';

/** KPI ya formateado para la plantilla. */
interface FilaKpi {
  nombre: string;
  formula: string;
  zona: KpiCalculado['zona'];
  /** Cadena vacía cuando no hay evidencia; la vista lo expresa con palabras. */
  valor: string;
  umbralGo: string;
  /** `null` en los KPIs sin zona kill: no se inventa un umbral. */
  umbralKill: string | null;
  fraccion: string | null;
  sinDatos: boolean;
}

interface GrupoKpis {
  clave: string;
  nombre: string;
  contexto: string;
  filas: FilaKpi[];
}

/**
 * Tablero de decisión de una idea: sus KPIs frente a los umbrales que el usuario
 * fijó en E2, agrupados por los cuatro grupos de la sección 7 del SRS.
 *
 * **El cliente no calcula nada.** La `zona` de cada KPI y el `resumen` vienen del
 * servidor y se pintan tal cual: comparar por nuestra cuenta crearía una segunda
 * fuente de verdad que podría discrepar por un redondeo del cálculo que sostiene
 * RNF-15 y del snapshot que conservará el veredicto (E6).
 *
 * El formateo de valores y umbrales sale de las utilidades de umbrales, para que un
 * mismo KPI se lea **igual** en las dos pantallas.
 */
@Component({
  selector: 'app-tablero-kpis',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tablero.html',
  styleUrls: ['../../../../shared/dominio.css', '../tablero.css'],
})
export class TableroKpis {
  private readonly tablero = inject(TableroService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';

  protected readonly recurso = httpResource<TableroIdea>(() =>
    this.tablero.solicitudTablero(this.ideaId),
  );

  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi ? e : new ErrorApi('ERROR_RED', 'No se pudo cargar el tablero.');
  });

  /** El resumen se muestra tal como llega; no se recuentan los KPIs. */
  protected readonly resumen = computed(() =>
    this.recurso.hasValue() ? this.recurso.value().resumen : null,
  );
  protected readonly fechaCalculo = computed(() =>
    this.recurso.hasValue() ? this.recurso.value().fechaCalculo.slice(0, 10) : '',
  );

  /**
   * KPIs agrupados en el orden del catálogo. Un grupo que llegue y no esté en el
   * catálogo local se muestra igualmente al final, degradando a su clave.
   */
  protected readonly grupos = computed<GrupoKpis[]>(() => {
    const kpis = this.recurso.hasValue() ? this.recurso.value().kpis : [];
    const porGrupo = new Map<string, KpiCalculado[]>();
    for (const kpi of kpis) {
      const existentes = porGrupo.get(kpi.grupo) ?? [];
      existentes.push(kpi);
      porGrupo.set(kpi.grupo, existentes);
    }

    const conocidos = ORDEN_GRUPOS.filter((g) => porGrupo.has(g)) as string[];
    const desconocidos = [...porGrupo.keys()].filter((g) => !conocidos.includes(g));

    return [...conocidos, ...desconocidos].map((clave) => ({
      clave,
      nombre: nombreGrupo(clave),
      contexto: contextoGrupo(clave),
      filas: (porGrupo.get(clave) ?? []).map((kpi) => this.aFila(kpi)),
    }));
  });

  private aFila(kpi: KpiCalculado): FilaKpi {
    const sinDatos = kpi.valor === null;
    return {
      nombre: nombreKpi(kpi.kpi),
      formula: formulaKpi(kpi.kpi),
      zona: kpi.zona,
      valor: etiquetaValor(kpi.valor, kpi.unidad),
      umbralGo: etiquetaValor(kpi.umbralGo, kpi.unidad),
      umbralKill: kpi.umbralKill === null ? null : etiquetaValor(kpi.umbralKill, kpi.unidad),
      fraccion:
        kpi.numerador === null || kpi.denominador === null
          ? null
          : `${kpi.numerador}/${kpi.denominador}`,
      sinDatos,
    };
  }

  reintentar(): void {
    this.recurso.reload();
  }
}
