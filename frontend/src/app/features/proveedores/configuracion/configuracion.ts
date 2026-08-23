import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import {
  ConfiguracionByok,
  GuardarByokRequest,
  ModeloIA,
  ProveedorIA,
  ProveedorId,
} from '../../../core/api/proveedor.model';
import { ProveedoresService } from '../proveedores.service';

/** Modelo del formulario BYOK. `proveedor` admite vacío hasta que se elige uno. */
interface ModeloByok {
  proveedor: ProveedorId | '';
  apiKey: string;
  modeloScoring: string;
  modeloVeredicto: string;
}

/**
 * Configuración BYOK del proveedor de IA (E7). El usuario elige proveedor, aporta su
 * API key y fija dos modelos por tarea (scoring y veredicto).
 *
 * **La API key nunca se muestra** (RNF-07): al cargar una config existente se
 * prellenan proveedor y modelos, pero el campo de la key queda vacío y hay que
 * reintroducirla para guardar cambios. Los modelos disponibles dependen del
 * proveedor elegido, según el catálogo curado.
 */
@Component({
  selector: 'app-configuracion-byok',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion.html',
  styleUrls: ['../../../shared/dominio.css'],
})
export class ConfiguracionByokComponent {
  private readonly proveedores = inject(ProveedoresService);

  protected readonly catalogoRecurso = httpResource<ProveedorIA[]>(() =>
    this.proveedores.solicitudCatalogo(),
  );
  protected readonly configRecurso = httpResource<ConfiguracionByok>(() =>
    this.proveedores.solicitudConfiguracion(),
  );

  protected readonly catalogo = computed(() =>
    this.catalogoRecurso.hasValue() ? this.catalogoRecurso.value() : [],
  );
  protected readonly cargando = computed(
    () => this.catalogoRecurso.isLoading() || this.configRecurso.isLoading(),
  );

  /** El catálogo es imprescindible; sin él no se puede configurar. */
  protected readonly errorCatalogo = computed(() => {
    const e = this.catalogoRecurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi
      ? e
      : new ErrorApi('ERROR_RED', 'No se pudo cargar el catálogo de proveedores.');
  });

  /**
   * La configuración: `404` no es un error, es "aún no configurada". Cualquier otro
   * fallo sí se comunica.
   */
  protected readonly configuracion = computed(() =>
    this.configRecurso.hasValue() ? this.configRecurso.value() : null,
  );
  protected readonly errorConfig = computed(() => {
    const e = this.configRecurso.error();
    if (!e || (e instanceof ErrorApi && e.codigo === 'RECURSO_NO_ENCONTRADO')) {
      return null;
    }
    return e instanceof ErrorApi
      ? e
      : new ErrorApi('ERROR_RED', 'No se pudo cargar tu configuración.');
  });

  protected readonly apiKeyRegistrada = computed(
    () => this.configuracion()?.apiKeyRegistrada ?? false,
  );

  protected readonly modelo = signal<ModeloByok>({
    proveedor: '',
    apiKey: '',
    modeloScoring: '',
    modeloVeredicto: '',
  });
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.proveedor, { message: 'Elige un proveedor' });
    required(ruta.apiKey, { message: 'Introduce tu API key' });
    required(ruta.modeloScoring, { message: 'Elige el modelo de scoring' });
    required(ruta.modeloVeredicto, { message: 'Elige el modelo de veredicto' });
  });

  /** Modelos del proveedor elegido; las dos listas de selección salen de aquí. */
  protected readonly modelosDisponibles = computed<ModeloIA[]>(() => {
    const proveedor = this.modelo().proveedor;
    if (!proveedor) {
      return [];
    }
    return this.catalogo().find((p) => p.id === proveedor)?.modelos ?? [];
  });

  private readonly inicializado = signal(false);

  protected readonly enviando = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly confirmandoBorrado = signal(false);
  protected readonly guardado = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly erroresCampo = signal<Record<string, string>>({});

  constructor() {
    // Prellena una sola vez desde la config existente; la API key nunca se rellena.
    effect(() => {
      const cfg = this.configuracion();
      untracked(() => {
        if (cfg && !this.inicializado()) {
          this.modelo.set({
            proveedor: cfg.proveedor,
            apiKey: '',
            modeloScoring: cfg.modeloScoring,
            modeloVeredicto: cfg.modeloVeredicto,
          });
          this.inicializado.set(true);
        }
      });
    });
  }

  onSubmit(): void {
    this.errorGeneral.set(null);
    this.erroresCampo.set({});
    this.guardado.set(false);
    void submit(this.formulario, async () => {
      this.enviando.set(true);
      try {
        await firstValueFrom(this.proveedores.guardar(this.payload()));
        // La key ya viajó cifrada; no la conservamos en memoria del formulario.
        this.modelo.update((m) => ({ ...m, apiKey: '' }));
        this.guardado.set(true);
        this.configRecurso.reload();
      } catch (error) {
        this.aplicarError(error);
      } finally {
        this.enviando.set(false);
      }
    });
  }

  private payload(): GuardarByokRequest {
    const { proveedor, apiKey, modeloScoring, modeloVeredicto } = this.modelo();
    return {
      proveedor: proveedor as ProveedorId,
      apiKey,
      modeloScoring,
      modeloVeredicto,
    };
  }

  pedirBorrado(): void {
    this.errorGeneral.set(null);
    this.confirmandoBorrado.set(true);
  }

  cancelarBorrado(): void {
    this.confirmandoBorrado.set(false);
  }

  async confirmarBorrado(): Promise<void> {
    this.eliminando.set(true);
    this.errorGeneral.set(null);
    try {
      await firstValueFrom(this.proveedores.eliminar());
      this.confirmandoBorrado.set(false);
      this.guardado.set(false);
      this.inicializado.set(false);
      this.modelo.set({ proveedor: '', apiKey: '', modeloScoring: '', modeloVeredicto: '' });
      this.configRecurso.reload();
    } catch (error) {
      this.errorGeneral.set(this.mensajeDeError(error));
      this.confirmandoBorrado.set(false);
    } finally {
      this.eliminando.set(false);
    }
  }

  private aplicarError(error: unknown): void {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'API_KEY_INVALIDA') {
        this.erroresCampo.set({ apiKey: 'El proveedor rechazó esta API key.' });
        return;
      }
      if (error.codigo === 'VALIDACION_FALLIDA' && error.detalles?.length) {
        const porCampo: Record<string, string> = {};
        for (const detalle of error.detalles) {
          porCampo[detalle.campo] = detalle.problema;
        }
        this.erroresCampo.set(porCampo);
        return;
      }
    }
    this.errorGeneral.set(this.mensajeDeError(error));
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'PROVEEDOR_IA_NO_DISPONIBLE') {
        return 'No se pudo validar la key: el proveedor no está disponible ahora. Inténtalo más tarde.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo guardar la configuración. Inténtalo de nuevo.';
  }
}
