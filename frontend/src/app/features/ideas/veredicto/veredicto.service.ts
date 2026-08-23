import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RespuestaPaginada } from '../../../core/api/paginacion.model';
import { Veredicto, VerificarVeredictoRequest } from '../../../core/api/veredicto.model';
import { environment } from '../../../../environments/environment';

/** Parámetros del historial de veredictos. El contrato solo pagina. */
export interface ListarVeredictosParams {
  pagina: number;
  porPagina: number;
}

/**
 * Servicio de recurso del veredicto de idea (tag `agente`, épica E6).
 *
 * El **emitir** no lleva cuerpo: el proveedor y el modelo salen de la config BYOK
 * del usuario (E7), en el servidor. El bloque del agente y el snapshot son de solo
 * lectura; lo único que el cliente escribe es la **verificación** (aprobar/anular).
 */
@Injectable({ providedIn: 'root' })
export class VeredictoService {
  private readonly http = inject(HttpClient);

  private base(ideaId: string): string {
    return `${environment.baseUrl}/ideas/${ideaId}/veredictos`;
  }

  /** Solicitud del historial paginado que consume `httpResource`. */
  solicitudHistorial(
    ideaId: string,
    { pagina, porPagina }: ListarVeredictosParams,
  ): HttpResourceRequest {
    return { url: this.base(ideaId), method: 'GET', params: { pagina, porPagina } };
  }

  /** Solicitud del detalle de un veredicto que consume `httpResource`. */
  solicitudDetalle(ideaId: string, idVeredicto: string): HttpResourceRequest {
    return { url: `${this.base(ideaId)}/${idVeredicto}`, method: 'GET' };
  }

  /**
   * `POST /ideas/{id}/veredictos` — invoca al agente. Sin cuerpo. Nace en
   * verificación `pendiente`. Sin BYOK → 409; salida inválida → 502; proveedor no
   * disponible → 503.
   */
  emitir(ideaId: string): Observable<Veredicto> {
    return this.http.post<Veredicto>(this.base(ideaId), {});
  }

  /** `GET /ideas/{id}/veredictos` — historial paginado (fuera de `httpResource`). */
  listar(
    ideaId: string,
    params: ListarVeredictosParams,
  ): Observable<RespuestaPaginada<Veredicto>> {
    return this.http.get<RespuestaPaginada<Veredicto>>(this.base(ideaId), {
      params: { pagina: params.pagina, porPagina: params.porPagina },
    });
  }

  /**
   * `POST /ideas/{id}/veredictos/{idVeredicto}/verificacion` — verificación humana.
   * `aprobado` hace firme el veredicto y cambia el estado de la idea; `anulado`
   * exige `nota`. Un veredicto ya verificado → 409.
   */
  verificar(
    ideaId: string,
    idVeredicto: string,
    cuerpo: VerificarVeredictoRequest,
  ): Observable<Veredicto> {
    return this.http.post<Veredicto>(
      `${this.base(ideaId)}/${idVeredicto}/verificacion`,
      cuerpo,
    );
  }
}
