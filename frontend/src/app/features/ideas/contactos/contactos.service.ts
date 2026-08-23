import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActualizarContactoRequest,
  Contacto,
  CrearContactoRequest,
  EstadoOutreach,
  RegistrarToqueRequest,
  TransicionEstadoRequest,
} from '../../../core/api/contacto.model';
import { RespuestaPaginada } from '../../../core/api/paginacion.model';
import { environment } from '../../../../environments/environment';

/** Parámetros del listado del embudo (`GET /ideas/{id}/contactos`). */
export interface ListarContactosParams {
  pagina: number;
  porPagina: number;
  estado?: EstadoOutreach;
}

/**
 * Servicio de recurso del tag `contactos`. Concentra las siete operaciones del tag;
 * los componentes no tocan `HttpClient`. El `ideaId` y el `idContacto` se interpolan
 * SIEMPRE en el path y nunca viajan en el cuerpo, que tampoco lleva `ownerId`,
 * `estado` (tiene su propia acción) ni fechas de toque (las fija el toque).
 *
 * El `Bearer`, la renovación ante `401` y la traducción a `ErrorApi` los aporta la
 * plomería del E0.
 */
@Injectable({ providedIn: 'root' })
export class ContactosService {
  private readonly http = inject(HttpClient);

  private base(ideaId: string): string {
    return `${environment.baseUrl}/ideas/${ideaId}/contactos`;
  }

  /** Solicitud del listado (URL + query) que consume `httpResource` en la lista. */
  solicitudListado(
    ideaId: string,
    { pagina, porPagina, estado }: ListarContactosParams,
  ): HttpResourceRequest {
    const params: Record<string, string | number> = { pagina, porPagina };
    if (estado) {
      params['estado'] = estado;
    }
    return { url: this.base(ideaId), method: 'GET', params };
  }

  /** Solicitud del detalle que consume `httpResource` en el detalle del contacto. */
  solicitudDetalle(ideaId: string, idContacto: string): HttpResourceRequest {
    return { url: `${this.base(ideaId)}/${idContacto}`, method: 'GET' };
  }

  /** `GET /ideas/{id}/contactos` — página de contactos, con filtro opcional por estado. */
  listar(ideaId: string, params: ListarContactosParams): Observable<RespuestaPaginada<Contacto>> {
    const solicitud = this.solicitudListado(ideaId, params);
    return this.http.get<RespuestaPaginada<Contacto>>(solicitud.url, { params: solicitud.params });
  }

  /** `POST /ideas/{id}/contactos` — crea un contacto (nace `por_contactar`). */
  crear(ideaId: string, datos: CrearContactoRequest): Observable<Contacto> {
    return this.http.post<Contacto>(this.base(ideaId), datos);
  }

  /** `GET /ideas/{id}/contactos/{idContacto}` — detalle de un contacto propio. */
  consultar(ideaId: string, idContacto: string): Observable<Contacto> {
    return this.http.get<Contacto>(`${this.base(ideaId)}/${idContacto}`);
  }

  /** `PATCH /ideas/{id}/contactos/{idContacto}` — edita el contenido, no el embudo. */
  editar(
    ideaId: string,
    idContacto: string,
    cambios: ActualizarContactoRequest,
  ): Observable<Contacto> {
    return this.http.patch<Contacto>(`${this.base(ideaId)}/${idContacto}`, cambios);
  }

  /** `DELETE /ideas/{id}/contactos/{idContacto}` — elimina un contacto. */
  eliminar(ideaId: string, idContacto: string): Observable<void> {
    return this.http.delete<void>(`${this.base(ideaId)}/${idContacto}`);
  }

  /**
   * `POST .../estado` — mueve el contacto por el embudo. Una transición no permitida
   * (incluido pedir `entrevistado`) responde `409 CONFLICTO`.
   */
  transicionar(ideaId: string, idContacto: string, estado: EstadoOutreach): Observable<Contacto> {
    const cuerpo: TransicionEstadoRequest = { estado };
    return this.http.post<Contacto>(`${this.base(ideaId)}/${idContacto}/estado`, cuerpo);
  }

  /**
   * `POST .../toques` — registra un toque de outreach. Sin `fecha` el momento lo fija
   * el servidor. El tercer toque responde `409 CONFLICTO`.
   */
  registrarToque(ideaId: string, idContacto: string, fecha?: string): Observable<Contacto> {
    const cuerpo: RegistrarToqueRequest = fecha ? { fecha } : {};
    return this.http.post<Contacto>(`${this.base(ideaId)}/${idContacto}/toques`, cuerpo);
  }
}
