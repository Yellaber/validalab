import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import { ActualizarUmbralRequest, Umbral } from '../../../core/api/umbral.model';
import { ORDEN_GRUPOS, contextoGrupo, formulaKpi, nombreGrupo, nombreKpi } from './catalogo-kpi';
import {
  FormatoUnidad,
  aTransporte,
  formatoDe,
  motivoFueraDeRango,
  parsear,
  textoDe,
} from './unidad-kpi';
import { UmbralesService } from './umbrales.service';

/** Borrador editable de una fila. El texto se guarda en crudo, tal como se teclea. */
interface FilaUmbral {
  umbral: Umbral;
  textoGo: string;
  textoKill: string;
  guardando: boolean;
  guardado: boolean;
  error: string | null;
  erroresCampo: Record<string, string>;
}

/** Fila ya derivada para la plantilla: etiquetas, formato y validación resueltos. */
interface VistaFila {
  fila: FilaUmbral;
  formato: FormatoUnidad;
  nombre: string;
  formula: string;
  tieneKill: boolean;
  errorGo: string | null;
  errorKill: string | null;
  puedeGuardar: boolean;
}

interface VistaGrupo {
  grupo: string;
  nombre: string;
  contexto: string;
  filas: VistaFila[];
}

function filaDe(umbral: Umbral): FilaUmbral {
  return {
    umbral,
    textoGo: textoDe(umbral.umbralGo, umbral.unidad),
    textoKill: textoDe(umbral.umbralKill, umbral.unidad),
    guardando: false,
    guardado: false,
    error: null,
    erroresCampo: {},
  };
}

/**
 * Umbrales kill/go de una idea (E2). El conjunto es de cardinalidad fija: el
 * contrato devuelve un `Umbral` por cada KPI del catálogo.
 *
 * Decisiones que gobiernan esta vista:
 * - El **agrupamiento** y la **unidad** se leen del `grupo`/`unidad` que trae cada
 *   `Umbral` en la respuesta; el cliente no cablea esa correspondencia. Un KPI sin
 *   etiqueta local se renderiza igual, degradando a su clave cruda.
 * - Cada fila mantiene su **borrador** en un `linkedSignal` derivado del recurso, de
 *   modo que las filas no se pisan entre sí y una recarga las resiembra.
 * - El guardado es **fila por fila** (`PUT` por KPI) y su respuesta reemplaza solo esa
 *   fila: no se recarga el conjunto, para no descartar las ediciones en curso.
 *
 * Aquí solo se **fija el criterio**: no se muestran KPIs calculados ni veredictos
 * (E5/E6), ni se ofrece restablecer a un valor por defecto (el contrato no expone
 * esa procedencia ni esa operación).
 */
@Component({
  selector: 'app-umbrales-idea',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './umbrales.html',
  styleUrls: ['../ideas.css', './umbrales.css'],
})
export class UmbralesIdea {
  private readonly umbrales = inject(UmbralesService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';

  protected readonly recurso = httpResource<Umbral[]>(() =>
    this.umbrales.solicitudLista(this.ideaId),
  );

  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi ? e : new ErrorApi('ERROR_RED', 'No se pudieron cargar.');
  });

  /** Borradores por fila, resembrados cuando el recurso trae un conjunto nuevo. */
  private readonly filas = linkedSignal<Umbral[], FilaUmbral[]>({
    source: () => this.recurso.value() ?? [],
    computation: (umbrales) => umbrales.map(filaDe),
  });

  /** Filas agrupadas por el `grupo` de la respuesta, en el orden del SRS. */
  protected readonly grupos = computed<VistaGrupo[]>(() => {
    const porGrupo = new Map<string, VistaFila[]>();
    for (const fila of this.filas()) {
      const vista = this.vistaDe(fila);
      const existentes = porGrupo.get(fila.umbral.grupo);
      if (existentes) {
        existentes.push(vista);
      } else {
        porGrupo.set(fila.umbral.grupo, [vista]);
      }
    }

    // Primero los grupos catalogados en su orden; después cualquier grupo nuevo
    // que traiga el contrato, para no ocultar filas que el cliente no conoce.
    const claves = [
      ...ORDEN_GRUPOS.filter((g) => porGrupo.has(g)),
      ...[...porGrupo.keys()].filter((g) => !ORDEN_GRUPOS.includes(g as never)),
    ];

    return claves.map((grupo) => ({
      grupo,
      nombre: nombreGrupo(grupo),
      contexto: contextoGrupo(grupo),
      filas: porGrupo.get(grupo) ?? [],
    }));
  });

  protected readonly vacio = computed(
    () => !this.cargando() && !this.error() && this.filas().length === 0,
  );

  reintentar(): void {
    this.recurso.reload();
  }

  editarGo(kpi: string, texto: string): void {
    this.actualizarFila(kpi, { textoGo: texto, guardado: false, error: null, erroresCampo: {} });
  }

  editarKill(kpi: string, texto: string): void {
    this.actualizarFila(kpi, { textoKill: texto, guardado: false, error: null, erroresCampo: {} });
  }

  async guardar(vista: VistaFila): Promise<void> {
    if (!vista.puedeGuardar) {
      return;
    }
    const { umbral, textoGo, textoKill } = vista.fila;
    const go = parsear(textoGo);
    if (go === null) {
      return;
    }

    const cuerpo: ActualizarUmbralRequest = { umbralGo: aTransporte(go, umbral.unidad) };
    if (vista.tieneKill) {
      const kill = parsear(textoKill);
      if (kill === null) {
        return;
      }
      cuerpo.umbralKill = aTransporte(kill, umbral.unidad);
    }

    this.actualizarFila(umbral.kpi, {
      guardando: true,
      guardado: false,
      error: null,
      erroresCampo: {},
    });
    try {
      const actualizado = await firstValueFrom(
        this.umbrales.fijar(this.ideaId, umbral.kpi, cuerpo),
      );
      // El `PUT` devuelve el umbral autoritativo del KPI: reemplaza solo esta fila.
      this.actualizarFila(umbral.kpi, { ...filaDe(actualizado), guardado: true });
    } catch (error) {
      this.actualizarFila(umbral.kpi, { guardando: false, ...this.errorDeFila(error) });
    }
  }

  /** Cambia una fila sin tocar las demás: un fallo aquí no contamina otras ediciones. */
  private actualizarFila(kpi: string, cambio: Partial<FilaUmbral>): void {
    this.filas.update((filas) =>
      filas.map((f) => (f.umbral.kpi === kpi ? { ...f, ...cambio } : f)),
    );
  }

  private errorDeFila(error: unknown): Pick<FilaUmbral, 'error' | 'erroresCampo'> {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'VALIDACION_FALLIDA' && error.detalles?.length) {
        const porCampo: Record<string, string> = {};
        for (const detalle of error.detalles) {
          porCampo[detalle.campo] = detalle.problema;
        }
        return { error: null, erroresCampo: porCampo };
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return { error: 'Este KPI ya no existe en el catálogo.', erroresCampo: {} };
      }
      if (error.codigo === 'ACCESO_DENEGADO') {
        return { error: 'No tienes acceso a esta idea.', erroresCampo: {} };
      }
      if (error.codigo === 'ERROR_RED') {
        return { error: error.message, erroresCampo: {} };
      }
    }
    return { error: 'No se pudo guardar el umbral. Inténtalo de nuevo.', erroresCampo: {} };
  }

  /** Resuelve etiquetas, formato y validación local de una fila para la plantilla. */
  private vistaDe(fila: FilaUmbral): VistaFila {
    const { umbral, erroresCampo } = fila;
    const unidad = umbral.unidad;
    const formato = formatoDe(unidad);
    const tieneKill = umbral.umbralKill !== null;

    const go = parsear(fila.textoGo);
    let errorGo = go === null ? 'Indica un número.' : motivoFueraDeRango(go, unidad);

    let errorKill: string | null = null;
    if (tieneKill) {
      const kill = parsear(fila.textoKill);
      if (kill === null) {
        errorKill = 'Indica un número.';
      } else {
        errorKill = motivoFueraDeRango(kill, unidad);
        if (!errorKill && go !== null && kill > go) {
          errorKill = 'El umbral kill no puede superar al go.';
        }
      }
    }

    const valida = !errorGo && !errorKill;
    const sinCambios =
      fila.textoGo === textoDe(umbral.umbralGo, unidad) &&
      (!tieneKill || fila.textoKill === textoDe(umbral.umbralKill, unidad));

    // Los errores del backend se muestran junto a los locales, sin sustituirlos.
    errorGo = errorGo ?? erroresCampo['umbralGo'] ?? null;
    errorKill = errorKill ?? erroresCampo['umbralKill'] ?? null;

    return {
      fila,
      formato,
      nombre: nombreKpi(umbral.kpi),
      formula: formulaKpi(umbral.kpi),
      tieneKill,
      errorGo,
      errorKill,
      puedeGuardar: valida && !sinCambios && !fila.guardando,
    };
  }
}
