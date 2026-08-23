import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EstimacionReevaluacion,
  ReevaluacionLoteRequest,
  ResultadoReevaluacion,
} from '../../../../core/api/reevaluacion.model';
import { environment } from '../../../../../environments/environment';

/**
 * Servicio de la re-evaluación en lote de las entrevistas de una idea (tag
 * `entrevistas`, épica E8b).
 *
 * La **estimación** es de solo lectura y no muta nada; la **ejecución** re-puntúa en
 * lote y es explícita (nunca automática). El costo es un estimado del consumo, no el
 * saldo (RNF-17).
 */
@Injectable({ providedIn: 'root' })
export class ReevaluacionService {
  private readonly http = inject(HttpClient);

  private base(ideaId: string): string {
    return `${environment.baseUrl}/ideas/${ideaId}/entrevistas/reevaluacion`;
  }

  /** Solicitud de la estimación (sin ejecutar) que consume `httpResource`. */
  solicitudEstimacion(ideaId: string): HttpResourceRequest {
    return { url: `${this.base(ideaId)}/estimacion`, method: 'GET' };
  }

  /** `GET /ideas/{id}/entrevistas/reevaluacion/estimacion` — estima sin ejecutar. */
  estimar(ideaId: string): Observable<EstimacionReevaluacion> {
    return this.http.get<EstimacionReevaluacion>(`${this.base(ideaId)}/estimacion`);
  }

  /**
   * `POST /ideas/{id}/entrevistas/reevaluacion` — ejecuta el lote. Sin cuerpo
   * re-evalúa todas las afectadas; con `idsEntrevistas`, ese subconjunto. Sin BYOK
   * → 409; proveedor no disponible → 503.
   */
  ejecutar(
    ideaId: string,
    cuerpo: ReevaluacionLoteRequest = {},
  ): Observable<ResultadoReevaluacion> {
    return this.http.post<ResultadoReevaluacion>(this.base(ideaId), cuerpo);
  }
}
