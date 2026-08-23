import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActualizarGuionRequest, CrearGuionRequest, Guion } from '../../core/api/guion.model';
import { RespuestaPaginada } from '../../core/api/paginacion.model';
import { environment } from '../../../environments/environment';

/** Parámetros del listado de guiones (`GET /guiones`). El contrato solo pagina. */
export interface ListarGuionesParams {
  pagina: number;
  porPagina: number;
}

/**
 * Servicio de recurso de las rutas `/guiones` del tag `entrevistas`. Concentra las
 * cinco operaciones; los componentes no tocan `HttpClient`.
 *
 * La ruta base **no lleva `ideaId`**: un guión es del usuario, no de una idea. El
 * `ownerId` tampoco viaja nunca en el cuerpo, lo deriva el backend del token.
 *
 * El `Bearer`, la renovación ante `401` y la traducción a `ErrorApi` los aporta la
 * plomería del E0.
 */
@Injectable({ providedIn: 'root' })
export class GuionesService {
  private readonly http = inject(HttpClient);

  private readonly base = `${environment.baseUrl}/guiones`;

  /** Solicitud del listado (URL + query) que consume `httpResource` en la lista. */
  solicitudListado({ pagina, porPagina }: ListarGuionesParams): HttpResourceRequest {
    return { url: this.base, method: 'GET', params: { pagina, porPagina } };
  }

  /** Solicitud del detalle que consume `httpResource` en el detalle del guión. */
  solicitudDetalle(idGuion: string): HttpResourceRequest {
    return { url: `${this.base}/${idGuion}`, method: 'GET' };
  }

  /** `GET /guiones` — página de guiones propios. */
  listar(params: ListarGuionesParams): Observable<RespuestaPaginada<Guion>> {
    const solicitud = this.solicitudListado(params);
    return this.http.get<RespuestaPaginada<Guion>>(solicitud.url, { params: solicitud.params });
  }

  /** `POST /guiones` — crea un guión con al menos una pregunta. */
  crear(datos: CrearGuionRequest): Observable<Guion> {
    return this.http.post<Guion>(this.base, datos);
  }

  /** `GET /guiones/{idGuion}` — detalle de un guión propio. */
  consultar(idGuion: string): Observable<Guion> {
    return this.http.get<Guion>(`${this.base}/${idGuion}`);
  }

  /**
   * `PATCH /guiones/{idGuion}` — edita el guión. Cuando incluye `preguntas`,
   * **reemplaza el conjunto ordenado completo**.
   */
  editar(idGuion: string, cambios: ActualizarGuionRequest): Observable<Guion> {
    return this.http.patch<Guion>(`${this.base}/${idGuion}`, cambios);
  }

  /** `DELETE /guiones/{idGuion}` — elimina un guión propio. */
  eliminar(idGuion: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${idGuion}`);
  }
}
