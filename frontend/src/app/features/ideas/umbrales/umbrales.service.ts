import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActualizarUmbralRequest, Kpi, Umbral } from '../../../core/api/umbral.model';
import { environment } from '../../../../environments/environment';

/**
 * Servicio de recurso de los umbrales kill/go de una idea (tag `ideas` del
 * contrato, endpoints `/ideas/{id}/umbrales`). A diferencia de las hipótesis, el
 * conjunto es de **cardinalidad fija**: el `GET` devuelve un `Umbral` por cada KPI
 * del catálogo y el `PUT` por KPI es idempotente (no se crean ni se borran filas).
 *
 * El `ideaId` y la clave del `kpi` viajan en el path; el cuerpo lleva solo los
 * valores editables (`grupo` y `unidad` son de solo lectura y nunca se envían).
 */
@Injectable({ providedIn: 'root' })
export class UmbralesService {
  private readonly http = inject(HttpClient);

  private base(ideaId: string): string {
    return `${environment.baseUrl}/ideas/${ideaId}/umbrales`;
  }

  /** Solicitud del conjunto (`GET /ideas/{id}/umbrales`) que consume `httpResource`. */
  solicitudLista(ideaId: string): HttpResourceRequest {
    return { url: this.base(ideaId), method: 'GET' };
  }

  /** `GET /ideas/{id}/umbrales` — un `Umbral` por cada KPI del catálogo. */
  listar(ideaId: string): Observable<Umbral[]> {
    return this.http.get<Umbral[]>(this.base(ideaId));
  }

  /**
   * `PUT /ideas/{id}/umbrales/{kpi}` — fija (idempotente) los umbrales de un KPI.
   * Devuelve el `Umbral` completo y autoritativo de ese KPI.
   */
  fijar(ideaId: string, kpi: Kpi, cuerpo: ActualizarUmbralRequest): Observable<Umbral> {
    return this.http.put<Umbral>(`${this.base(ideaId)}/${kpi}`, cuerpo);
  }
}
