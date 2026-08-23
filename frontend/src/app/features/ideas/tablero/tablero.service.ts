import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActualizarAlertaRequest, AlertaKpi, TableroIdea } from '../../../core/api/kpi.model';
import { environment } from '../../../../environments/environment';

/** Parámetros del listado de alertas. El contrato filtra por `leida`. */
export interface ListarAlertasParams {
  pagina: number;
  porPagina: number;
  leida?: boolean;
}

/**
 * Servicio de recurso del tag `kpis`: el tablero de decisión y las alertas de cruce
 * de umbral.
 *
 * No hay `crear` ni `eliminar` de alertas, y no es un olvido: **las genera el
 * sistema**. Lo único que el cliente escribe es el campo `leida`.
 */
@Injectable({ providedIn: 'root' })
export class TableroService {
  private readonly http = inject(HttpClient);

  private base(ideaId: string): string {
    return `${environment.baseUrl}/ideas/${ideaId}`;
  }

  /** Solicitud del tablero que consume `httpResource`. */
  solicitudTablero(ideaId: string): HttpResourceRequest {
    return { url: `${this.base(ideaId)}/kpis`, method: 'GET' };
  }

  /** Solicitud del listado de alertas (URL + query) que consume `httpResource`. */
  solicitudAlertas(
    ideaId: string,
    { pagina, porPagina, leida }: ListarAlertasParams,
  ): HttpResourceRequest {
    const params: Record<string, string | number | boolean> = { pagina, porPagina };
    if (leida !== undefined) {
      params['leida'] = leida;
    }
    return { url: `${this.base(ideaId)}/alertas`, method: 'GET', params };
  }

  /** `GET /ideas/{id}/kpis` — tablero completo con sus KPIs y su resumen. */
  consultarTablero(ideaId: string): Observable<TableroIdea> {
    return this.http.get<TableroIdea>(`${this.base(ideaId)}/kpis`);
  }

  /** `PATCH /ideas/{id}/alertas/{idAlerta}` — el cuerpo se limita a `leida`. */
  marcarLeida(ideaId: string, idAlerta: string, leida = true): Observable<AlertaKpi> {
    const cuerpo: ActualizarAlertaRequest = { leida };
    return this.http.patch<AlertaKpi>(`${this.base(ideaId)}/alertas/${idAlerta}`, cuerpo);
  }
}
