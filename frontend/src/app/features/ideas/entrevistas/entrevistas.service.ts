import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActualizarEntrevistaRequest,
  CrearEntrevistaRequest,
  Entrevista,
  EstadoScoring,
} from '../../../core/api/entrevista.model';
import { RespuestaPaginada } from '../../../core/api/paginacion.model';
import { environment } from '../../../../environments/environment';

/** Parámetros del listado de entrevistas, con los dos filtros del contrato. */
export interface ListarEntrevistasParams {
  pagina: number;
  porPagina: number;
  contactoId?: string;
  estadoScoring?: EstadoScoring;
}

/**
 * Servicio de recurso del tag `entrevistas`, limitado a la **captura**: crear,
 * listar, consultar, editar y eliminar.
 *
 * `puntuar` y `ajustarScore` existen en el contrato pero **no se exponen aquí**:
 * llegan con la vista que los usa, en el change de scoring y ajuste. Un servicio con
 * métodos que nadie llama invita a usarlos antes de tiempo.
 *
 * El `ideaId` se interpola SIEMPRE en el path y nunca viaja en el cuerpo, que
 * tampoco lleva `ownerId` ni el bloque `score` (lo produce el agente).
 */
@Injectable({ providedIn: 'root' })
export class EntrevistasService {
  private readonly http = inject(HttpClient);

  private base(ideaId: string): string {
    return `${environment.baseUrl}/ideas/${ideaId}/entrevistas`;
  }

  /** Solicitud del listado (URL + query) que consume `httpResource` en la lista. */
  solicitudListado(
    ideaId: string,
    { pagina, porPagina, contactoId, estadoScoring }: ListarEntrevistasParams,
  ): HttpResourceRequest {
    const params: Record<string, string | number> = { pagina, porPagina };
    if (contactoId) {
      params['contactoId'] = contactoId;
    }
    if (estadoScoring) {
      params['estadoScoring'] = estadoScoring;
    }
    return { url: this.base(ideaId), method: 'GET', params };
  }

  /** Solicitud del detalle que consume `httpResource` en el detalle. */
  solicitudDetalle(ideaId: string, idEntrevista: string): HttpResourceRequest {
    return { url: `${this.base(ideaId)}/${idEntrevista}`, method: 'GET' };
  }

  /** `GET /ideas/{id}/entrevistas` — página de entrevistas, con filtros opcionales. */
  listar(
    ideaId: string,
    params: ListarEntrevistasParams,
  ): Observable<RespuestaPaginada<Entrevista>> {
    const solicitud = this.solicitudListado(ideaId, params);
    return this.http.get<RespuestaPaginada<Entrevista>>(solicitud.url, {
      params: solicitud.params,
    });
  }

  /**
   * `POST /ideas/{id}/entrevistas` — registra la entrevista. Mueve el contacto a
   * `entrevistado` y dispara el scoring del agente.
   */
  crear(ideaId: string, datos: CrearEntrevistaRequest): Observable<Entrevista> {
    return this.http.post<Entrevista>(this.base(ideaId), datos);
  }

  /** `GET /ideas/{id}/entrevistas/{idEntrevista}` — detalle de una entrevista propia. */
  consultar(ideaId: string, idEntrevista: string): Observable<Entrevista> {
    return this.http.get<Entrevista>(`${this.base(ideaId)}/${idEntrevista}`);
  }

  /**
   * `PATCH .../{idEntrevista}` — edita respuestas y/o citas. Cambiar las respuestas
   * invalida el score previo y re-dispara el scoring.
   */
  editar(
    ideaId: string,
    idEntrevista: string,
    cambios: ActualizarEntrevistaRequest,
  ): Observable<Entrevista> {
    return this.http.patch<Entrevista>(`${this.base(ideaId)}/${idEntrevista}`, cambios);
  }

  /**
   * `DELETE .../{idEntrevista}` — elimina la entrevista y devuelve su contacto al
   * estado `agendado`, de modo que vuelve a poder entrevistarse.
   */
  eliminar(ideaId: string, idEntrevista: string): Observable<void> {
    return this.http.delete<void>(`${this.base(ideaId)}/${idEntrevista}`);
  }
}
