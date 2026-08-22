import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { Contacto, EstadoOutreach } from '../../../../core/api/contacto.model';
import { ErrorApi } from '../../../../core/api/error-api.model';
import { ContactosService } from '../contactos.service';
import {
  ACCION_TRANSICION,
  ETIQUETA_CANAL,
  ETIQUETA_ESTADO_OUTREACH,
  ETIQUETA_ORIGEN,
  alcanzoLimiteDeToques,
  destinosAlcanzables,
  toquesDe,
} from '../embudo';

/** Operación que provocó un error, para traducir el `409` según la regla que se violó. */
type Operacion = 'transicion' | 'toque' | 'eliminar';

/**
 * Detalle de un contacto propio y hogar de sus acciones: transición del embudo,
 * registro de toques y eliminación.
 *
 * Dos matices propios de este tag:
 * - `CONFLICTO` significa cosas distintas según la acción (transición no permitida vs.
 *   límite de toques), así que el mensaje lo elige quien invocó la operación. Se sigue
 *   sin leer nunca el `mensaje` del backend.
 * - Un contacto es información personal: ante `ACCESO_DENEGADO` no se renderiza ningún
 *   dato, y el error va en lugar del contenido.
 */
@Component({
  selector: 'app-detalle-contacto',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle.html',
  styleUrls: ['../../../../shared/dominio.css', '../contactos.css'],
})
export class DetalleContacto {
  private readonly contactos = inject(ContactosService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';
  protected readonly id = this.ruta.snapshot.paramMap.get('idContacto') ?? '';

  protected readonly etiquetaEstado = ETIQUETA_ESTADO_OUTREACH;
  protected readonly etiquetaCanal = ETIQUETA_CANAL;
  protected readonly etiquetaOrigen = ETIQUETA_ORIGEN;
  protected readonly accionTransicion = ACCION_TRANSICION;

  protected readonly recurso = httpResource<Contacto>(() =>
    this.contactos.solicitudDetalle(this.ideaId, this.id),
  );

  protected readonly contacto = computed(() => this.recurso.value());
  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = computed(() => {
    const e = this.recurso.error();
    if (!e) {
      return null;
    }
    return e instanceof ErrorApi ? e : new ErrorApi('ERROR_RED', 'No se pudo cargar el contacto.');
  });

  protected readonly toques = computed(() => {
    const c = this.contacto();
    return c ? toquesDe(c) : 0;
  });
  protected readonly limiteDeToques = computed(() => {
    const c = this.contacto();
    return c ? alcanzoLimiteDeToques(c) : false;
  });
  protected readonly destinos = computed<EstadoOutreach[]>(() => {
    const c = this.contacto();
    return c ? destinosAlcanzables(c.estado) : [];
  });

  protected readonly fechaToque = signal('');
  protected readonly accionEnCurso = signal(false);
  protected readonly errorAccion = signal<string | null>(null);
  protected readonly confirmandoBorrado = signal(false);

  reintentar(): void {
    this.recurso.reload();
  }

  transicionar(estado: EstadoOutreach): void {
    void this.ejecutar(this.contactos.transicionar(this.ideaId, this.id, estado), 'transicion');
  }

  cambiarFechaToque(valor: string): void {
    this.fechaToque.set(valor);
  }

  /** La fecha se omite cuando está vacía: así el reloj de referencia es el del servidor. */
  registrarToque(): void {
    const fecha = this.fechaToque().trim();
    void this.ejecutar(
      this.contactos.registrarToque(
        this.ideaId,
        this.id,
        fecha ? new Date(fecha).toISOString() : undefined,
      ),
      'toque',
    );
    this.fechaToque.set('');
  }

  pedirEliminar(): void {
    this.errorAccion.set(null);
    this.confirmandoBorrado.set(true);
  }

  cancelarEliminar(): void {
    this.confirmandoBorrado.set(false);
  }

  async confirmarEliminar(): Promise<void> {
    this.errorAccion.set(null);
    this.accionEnCurso.set(true);
    try {
      await firstValueFrom(this.contactos.eliminar(this.ideaId, this.id));
      await this.router.navigate(['/ideas', this.ideaId, 'contactos']);
    } catch (error) {
      this.errorAccion.set(this.mensajeDeError(error, 'eliminar'));
    } finally {
      this.accionEnCurso.set(false);
    }
  }

  private async ejecutar(operacion: Observable<Contacto>, cual: Operacion): Promise<void> {
    this.errorAccion.set(null);
    this.accionEnCurso.set(true);
    try {
      await firstValueFrom(operacion);
      this.recurso.reload();
    } catch (error) {
      this.errorAccion.set(this.mensajeDeError(error, cual));
    } finally {
      this.accionEnCurso.set(false);
    }
  }

  /**
   * El `409` del tag cubre dos reglas distintas; el mensaje se elige por la operación
   * que lo provocó, no solo por el `codigo`.
   */
  private mensajeDeError(error: unknown, cual: Operacion): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'CONFLICTO') {
        if (cual === 'transicion') {
          return 'Ese movimiento no está permitido desde el estado actual del contacto.';
        }
        if (cual === 'toque') {
          return 'Este contacto ya tiene los dos toques que permite el método.';
        }
      }
      if (error.codigo === 'ACCESO_DENEGADO') {
        return 'No tienes acceso a este contacto.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'Este contacto ya no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo completar la acción. Inténtalo de nuevo.';
  }
}
