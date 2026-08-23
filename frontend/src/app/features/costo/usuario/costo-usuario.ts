import { CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CostoUsuario, PrecioModelo } from '../../../core/api/costo.model';
import { ErrorApi } from '../../../core/api/error-api.model';
import { CostoService } from '../costo.service';

/**
 * Costo estimado total del usuario, con desglose por idea y la tabla de precios
 * vigente (E8). Todo lo calcula el servidor; el cliente lo presenta.
 *
 * **No es el saldo de la cuenta** (RNF-17): es un estimado del consumo vía
 * ValidaLab. Se muestra la `aclaracion` normativa y, para recargar, el enlace al
 * panel de facturación del proveedor.
 */
@Component({
  selector: 'app-costo-usuario',
  imports: [RouterLink, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './costo-usuario.html',
  styleUrls: ['../../../shared/dominio.css'],
})
export class CostoUsuarioComponent {
  private readonly costo = inject(CostoService);

  protected readonly recurso = httpResource<CostoUsuario>(() =>
    this.costo.solicitudCostoUsuario(),
  );
  protected readonly preciosRecurso = httpResource<PrecioModelo[]>(() =>
    this.costo.solicitudPrecios(),
  );

  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi ? e : new ErrorApi('ERROR_RED', 'No se pudo cargar el costo.');
  });

  protected readonly costoUsuario = computed(() =>
    this.recurso.hasValue() ? this.recurso.value() : null,
  );
  protected readonly precios = computed(() =>
    this.preciosRecurso.hasValue() ? this.preciosRecurso.value() : [],
  );

  reintentar(): void {
    this.recurso.reload();
  }
}
