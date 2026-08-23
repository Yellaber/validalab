import { httpResource } from '@angular/common/http';
import { Signal, computed, inject } from '@angular/core';
import { Contacto } from '../../../core/api/contacto.model';
import { Guion } from '../../../core/api/guion.model';
import { RespuestaPaginada } from '../../../core/api/paginacion.model';
import { GuionesService } from '../../guiones/guiones.service';
import { ContactosService } from '../contactos/contactos.service';

/**
 * Cuántos contactos y guiones se piden para poblar selectores y resolver nombres.
 * El contrato no ofrece listados sin paginar, así que se pide una página generosa;
 * su límite está recogido en los riesgos del change.
 */
const CATALOGO_POR_PAGINA = 200;

/** Lo que se muestra cuando un identificador no resuelve. Nunca se pinta el UUID. */
export const NOMBRE_NO_DISPONIBLE = 'No disponible';

/** Estados desde los que un contacto **no** puede entrevistarse (el contrato responde `409`). */
const NO_ENTREVISTABLES: ReadonlySet<string> = new Set(['entrevistado', 'descartado']);

export interface CatalogosIdea {
  /**
   * Todos los contactos de la idea. Lo usa el **filtro** del listado, que mira al
   * pasado: quien ya fue entrevistado es justo por quien tiene sentido filtrar.
   */
  contactos: Signal<Contacto[]>;
  /** Contactos de la idea que aún pueden entrevistarse. Lo usa el **alta**. */
  entrevistables: Signal<Contacto[]>;
  /** Todos los guiones propios, para elegir con cuál se condujo la entrevista. */
  guiones: Signal<Guion[]>;
  /** Resuelve `contactoId` a nombre, degradando si no está entre los cargados. */
  nombreContacto: Signal<(id: string) => string>;
  /** Resuelve `guionId` a nombre, degradando si no está entre los cargados. */
  nombreGuion: Signal<(id: string) => string>;
  cargando: Signal<boolean>;
  recargar: () => void;
}

/**
 * Carga una vez los contactos y los guiones de la idea y expone lo que las vistas de
 * entrevistas necesitan de ellos.
 *
 * Existe porque `Entrevista` solo trae `contactoId` y `guionId`: sin esto, cualquier
 * vista mostraría UUID. Se resuelve con **dos peticiones por pantalla**, no una por
 * fila.
 *
 * Debe invocarse en un contexto de inyección (p. ej. la inicialización de un campo
 * de componente), porque usa `inject()` y `httpResource`.
 */
export function catalogosDeIdea(ideaId: string): CatalogosIdea {
  const contactos = inject(ContactosService);
  const guiones = inject(GuionesService);

  const recursoContactos = httpResource<RespuestaPaginada<Contacto>>(() =>
    contactos.solicitudListado(ideaId, { pagina: 1, porPagina: CATALOGO_POR_PAGINA }),
  );
  const recursoGuiones = httpResource<RespuestaPaginada<Guion>>(() =>
    guiones.solicitudListado({ pagina: 1, porPagina: CATALOGO_POR_PAGINA }),
  );

  const listaContactos = computed<Contacto[]>(() => recursoContactos.value()?.datos ?? []);
  const listaGuiones = computed<Guion[]>(() => recursoGuiones.value()?.datos ?? []);

  const porIdContacto = computed(
    () => new Map(listaContactos().map((c) => [c.id, c.nombre] as const)),
  );
  const porIdGuion = computed(() => new Map(listaGuiones().map((g) => [g.id, g.nombre] as const)));

  return {
    contactos: listaContactos,
    // Se excluyen aquí y no en el servidor porque el contrato filtra por UN estado a
    // la vez, y hacen falta «todos menos dos».
    entrevistables: computed(() =>
      listaContactos().filter((c) => !NO_ENTREVISTABLES.has(c.estado)),
    ),
    guiones: listaGuiones,
    nombreContacto: computed(() => {
      const mapa = porIdContacto();
      return (id: string) => mapa.get(id) ?? NOMBRE_NO_DISPONIBLE;
    }),
    nombreGuion: computed(() => {
      const mapa = porIdGuion();
      return (id: string) => mapa.get(id) ?? NOMBRE_NO_DISPONIBLE;
    }),
    cargando: computed(() => recursoContactos.isLoading() || recursoGuiones.isLoading()),
    recargar: () => {
      recursoContactos.reload();
      recursoGuiones.reload();
    },
  };
}
