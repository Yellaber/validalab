import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActualizarIdeaRequest,
  CrearIdeaRequest,
  EstadoIdea,
  Idea,
} from '../../core/api/idea.model';
import { RespuestaPaginada } from '../../core/api/paginacion.model';
import { environment } from '../../../environments/environment';

/** Parámetros del listado paginado del portafolio (`GET /ideas`). */
export interface ListarIdeasParams {
  pagina: number;
  porPagina: number;
  estado?: EstadoIdea;
}

/**
 * Servicio de recurso del tag `ideas` del contrato. Concentra las llamadas HTTP de
 * la entidad `Idea` (los componentes no tocan `HttpClient`). El `Bearer`, la
 * renovación ante `401` y la traducción de errores a `ErrorApi` los aporta la
 * plomería del E0 (interceptores). El aislamiento por `ownerId` lo gobierna el
 * backend: el cliente NUNCA lo envía.
 */
@Injectable({ providedIn: 'root' })
export class IdeasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/ideas`;

  /**
   * Solicitud del listado (URL + query params) que consume `httpResource` en la
   * lista. Omite `estado` cuando no hay filtro; nunca incluye `ownerId`.
   */
  solicitudListado({ pagina, porPagina, estado }: ListarIdeasParams): HttpResourceRequest {
    const params: Record<string, string | number> = { pagina, porPagina };
    if (estado) {
      params['estado'] = estado;
    }
    return { url: this.base, method: 'GET', params };
  }

  /** Solicitud del detalle (`GET /ideas/{id}`) que consume `httpResource` en el detalle. */
  solicitudDetalle(id: string): HttpResourceRequest {
    return { url: `${this.base}/${id}`, method: 'GET' };
  }

  /** `GET /ideas` — página de ideas propias, con filtro opcional por estado. */
  listar(params: ListarIdeasParams): Observable<RespuestaPaginada<Idea>> {
    const solicitud = this.solicitudListado(params);
    return this.http.get<RespuestaPaginada<Idea>>(solicitud.url, { params: solicitud.params });
  }

  /** `POST /ideas` — crea una idea (nace en `borrador`). */
  crear(datos: CrearIdeaRequest): Observable<Idea> {
    return this.http.post<Idea>(this.base, datos);
  }

  /** `GET /ideas/{id}` — detalle de una idea propia. */
  consultar(id: string): Observable<Idea> {
    return this.http.get<Idea>(`${this.base}/${id}`);
  }

  /** `PATCH /ideas/{id}` — edita el contenido (no el `estado`). */
  editar(id: string, cambios: ActualizarIdeaRequest): Observable<Idea> {
    return this.http.patch<Idea>(`${this.base}/${id}`, cambios);
  }

  /** `POST /ideas/{id}/archivar` — marca `archivada` conservando la evidencia. */
  archivar(id: string): Observable<Idea> {
    return this.http.post<Idea>(`${this.base}/${id}/archivar`, null);
  }

  /** `POST /ideas/{id}/desarchivar` — reabre una idea `archivada` a `borrador`. */
  desarchivar(id: string): Observable<Idea> {
    return this.http.post<Idea>(`${this.base}/${id}/desarchivar`, null);
  }
}
