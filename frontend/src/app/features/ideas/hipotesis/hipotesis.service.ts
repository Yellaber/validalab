import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActualizarHipotesisRequest,
  CrearHipotesisRequest,
  Hipotesis,
} from '../../../core/api/hipotesis.model';
import { environment } from '../../../../environments/environment';

/**
 * Servicio de recurso de las hipótesis de una idea (tag `ideas` del contrato,
 * endpoints anidados bajo `/ideas/{id}/hipotesis`). El `ideaId` se interpola
 * SIEMPRE en el path y NUNCA viaja en el cuerpo; el `ownerId` lo deriva el
 * backend del token. El `Bearer`, la renovación ante `401` y la traducción de
 * errores a `ErrorApi` los aporta la plomería del E0 (interceptores).
 *
 * La colección es pequeña y el contrato la devuelve como arreglo plano: no
 * participa del sobre `RespuestaPaginada`.
 */
@Injectable({ providedIn: 'root' })
export class HipotesisService {
  private readonly http = inject(HttpClient);

  private base(ideaId: string): string {
    return `${environment.baseUrl}/ideas/${ideaId}/hipotesis`;
  }

  /** Solicitud del listado (`GET /ideas/{id}/hipotesis`) que consume `httpResource`. */
  solicitudLista(ideaId: string): HttpResourceRequest {
    return { url: this.base(ideaId), method: 'GET' };
  }

  /** `GET /ideas/{id}/hipotesis` — hipótesis de la idea, sin paginar. */
  listar(ideaId: string): Observable<Hipotesis[]> {
    return this.http.get<Hipotesis[]>(this.base(ideaId));
  }

  /** `POST /ideas/{id}/hipotesis` — crea una hipótesis (nace `pendiente`). */
  crear(ideaId: string, datos: CrearHipotesisRequest): Observable<Hipotesis> {
    return this.http.post<Hipotesis>(this.base(ideaId), datos);
  }

  /**
   * `PATCH /ideas/{id}/hipotesis/{idHipotesis}` — edita `tipo`/`enunciado` y/o
   * marca el `estado`. El cuerpo nunca incluye `ideaId`.
   */
  actualizar(
    ideaId: string,
    idHipotesis: string,
    cambios: ActualizarHipotesisRequest,
  ): Observable<Hipotesis> {
    return this.http.patch<Hipotesis>(`${this.base(ideaId)}/${idHipotesis}`, cambios);
  }

  /** `DELETE /ideas/{id}/hipotesis/{idHipotesis}` — elimina una hipótesis. */
  eliminar(ideaId: string, idHipotesis: string): Observable<void> {
    return this.http.delete<void>(`${this.base(ideaId)}/${idHipotesis}`);
  }
}
