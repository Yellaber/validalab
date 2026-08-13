import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  ActualizarContactoRequest,
  CanalContacto,
  Contacto,
  CrearContactoRequest,
  OrigenContacto,
} from '../../../../core/api/contacto.model';
import { ErrorApi } from '../../../../core/api/error-api.model';
import { ContactosService } from '../contactos.service';
import { CANALES, ETIQUETA_CANAL, ETIQUETA_ORIGEN, ORIGENES } from '../embudo';

/** Modelo del formulario: contenido. Nunca el `estado` ni las fechas de toque. */
interface ModeloContacto {
  nombre: string;
  perfil: string;
  enlace: string;
  canal: CanalContacto;
  origen: OrigenContacto;
  referidoPorId: string;
  notas: string;
}

/** Cuántos candidatos a referidor se piden; el contrato no ofrece listado sin paginar. */
const CANDIDATOS_POR_PAGINA = 100;

/**
 * Formulario de contacto reutilizado por alta y edición (Signal Forms). En alta parte
 * vacío y hace `POST`; en edición carga el contacto y hace `PATCH`.
 *
 * NO expone control de `estado` ni de fechas de toque: el embudo se mueve con su
 * acción de transición y los toques con la suya, ambas en el detalle.
 *
 * El selector de referidor solo se puebla cuando el `origen` es `referido`, lista
 * contactos de la misma idea y excluye el contacto en edición.
 */
@Component({
  selector: 'app-formulario-contacto',
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario.html',
  styleUrls: ['../../ideas.css', '../contactos.css'],
})
export class FormularioContacto {
  private readonly contactos = inject(ContactosService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly ideaId = this.ruta.snapshot.paramMap.get('id') ?? '';
  protected readonly id = this.ruta.snapshot.paramMap.get('idContacto');
  protected readonly modoEdicion = this.id !== null;

  protected readonly canales = CANALES;
  protected readonly origenes = ORIGENES;
  protected readonly etiquetaCanal = ETIQUETA_CANAL;
  protected readonly etiquetaOrigen = ETIQUETA_ORIGEN;

  protected readonly modelo = signal<ModeloContacto>({
    nombre: '',
    perfil: '',
    enlace: '',
    canal: 'linkedin',
    origen: 'busqueda_directa',
    referidoPorId: '',
    notas: '',
  });
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.nombre, { message: 'El nombre es obligatorio' });
  });

  /** El vínculo de referido solo aplica —y solo se pregunta— con `origen: referido`. */
  protected readonly esReferido = computed(() => this.modelo().origen === 'referido');

  protected readonly candidatos = signal<Contacto[]>([]);
  private candidatosPedidos = false;

  protected readonly cargando = signal(this.modoEdicion);
  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly erroresCampo = signal<Record<string, string>>({});

  constructor() {
    if (this.id) {
      void this.cargarContacto(this.id);
    }
  }

  private async cargarContacto(id: string): Promise<void> {
    this.cargando.set(true);
    try {
      const contacto = await firstValueFrom(this.contactos.consultar(this.ideaId, id));
      this.modelo.set({
        nombre: contacto.nombre,
        perfil: contacto.perfil ?? '',
        enlace: contacto.enlace ?? '',
        canal: contacto.canal,
        origen: contacto.origen,
        referidoPorId: contacto.referidoPorId ?? '',
        notas: contacto.notas ?? '',
      });
      if (contacto.origen === 'referido') {
        void this.cargarCandidatos();
      }
    } catch (error) {
      this.errorGeneral.set(this.mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * Pide los candidatos a referidor una sola vez, al elegir `referido`. Excluye el
   * contacto en edición: nadie se refiere a sí mismo.
   */
  private async cargarCandidatos(): Promise<void> {
    if (this.candidatosPedidos) {
      return;
    }
    this.candidatosPedidos = true;
    try {
      const pagina = await firstValueFrom(
        this.contactos.listar(this.ideaId, { pagina: 1, porPagina: CANDIDATOS_POR_PAGINA }),
      );
      this.candidatos.set(pagina.datos.filter((c) => c.id !== this.id));
    } catch {
      // Sin candidatos el selector queda vacío; el vínculo puede fijarse más tarde.
      this.candidatos.set([]);
    }
  }

  cambiarOrigen(valor: string): void {
    this.modelo.update((m) => ({ ...m, origen: valor as OrigenContacto }));
    if (valor === 'referido') {
      void this.cargarCandidatos();
    }
  }

  onSubmit(): void {
    this.errorGeneral.set(null);
    this.erroresCampo.set({});
    void submit(this.formulario, async () => {
      this.enviando.set(true);
      try {
        if (this.id) {
          await firstValueFrom(this.contactos.editar(this.ideaId, this.id, this.payload()));
          await this.router.navigate(['/ideas', this.ideaId, 'contactos', this.id]);
        } else {
          const creado = await firstValueFrom(
            this.contactos.crear(this.ideaId, this.payload() as CrearContactoRequest),
          );
          await this.router.navigate(['/ideas', this.ideaId, 'contactos', creado.id]);
        }
      } catch (error) {
        this.aplicarError(error);
      } finally {
        this.enviando.set(false);
      }
    });
  }

  /**
   * Construye el cuerpo omitiendo los opcionales vacíos. `referidoPorId` solo viaja
   * cuando el origen es `referido`; en cualquier otro caso se omite.
   */
  private payload(): CrearContactoRequest & ActualizarContactoRequest {
    const { nombre, perfil, enlace, canal, origen, referidoPorId, notas } = this.modelo();
    const cuerpo: CrearContactoRequest & ActualizarContactoRequest = { nombre, canal, origen };
    if (perfil.trim()) {
      cuerpo.perfil = perfil;
    }
    if (enlace.trim()) {
      cuerpo.enlace = enlace;
    }
    if (notas.trim()) {
      cuerpo.notas = notas;
    }
    if (origen === 'referido' && referidoPorId) {
      cuerpo.referidoPorId = referidoPorId;
    }
    return cuerpo;
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
        return 'No tienes acceso a este contacto.';
      }
      if (error.codigo === 'RECURSO_NO_ENCONTRADO') {
        return 'Este contacto no existe.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return this.modoEdicion
      ? 'No se pudo guardar el contacto. Inténtalo de nuevo.'
      : 'No se pudo crear el contacto. Inténtalo de nuevo.';
  }
}
