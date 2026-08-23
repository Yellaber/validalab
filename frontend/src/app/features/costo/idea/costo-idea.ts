import { CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CostoIdea, DesgloseCostoTarea } from '../../../core/api/costo.model';
import { ErrorApi } from '../../../core/api/error-api.model';
import { ETIQUETA_TAREA_COSTO } from '../etiquetas';
import { CostoService } from '../costo.service';

/** Fila del desglose por tarea, con la etiqueta legible de la tarea. */
interface FilaTarea extends DesgloseCostoTarea {
  nombre: string;
}

/**
 * Costo estimado del consumo de IA de una idea, desglosado por tarea del agente
 * (`scoring`/`veredicto`), con sus tokens y llamadas (E8).
 *
 * **No es el saldo** (RNF-17): es un estimado del consumo vía ValidaLab. Se muestra
 * la `aclaracion` normativa y el enlace de facturación del proveedor para recargar.
 */
@Component({
  selector: 'app-costo-idea',
  imports: [RouterLink, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './costo-idea.html',
  styleUrls: ['../../../shared/dominio.css'],
})
export class CostoIdeaComponent {
  private readonly costo = inject(CostoService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';

  protected readonly recurso = httpResource<CostoIdea>(() =>
    this.costo.solicitudCostoIdea(this.ideaId),
  );

  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi
      ? e
      : new ErrorApi('ERROR_RED', 'No se pudo cargar el costo de la idea.');
  });

  protected readonly costoIdea = computed(() =>
    this.recurso.hasValue() ? this.recurso.value() : null,
  );

  protected readonly desglose = computed<FilaTarea[]>(() =>
    (this.costoIdea()?.desglosePorTarea ?? []).map((t) => ({
      ...t,
      nombre: ETIQUETA_TAREA_COSTO[t.tarea] ?? t.tarea,
    })),
  );

  reintentar(): void {
    this.recurso.reload();
  }
}
