import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CostoIdea, CostoUsuario, PrecioModelo } from '../../core/api/costo.model';
import { environment } from '../../../environments/environment';

/**
 * Servicio de recurso de la visibilidad de costo estimado (tag `proveedores`,
 * épica E8).
 *
 * Todo es de **solo lectura y calculado por el servidor**: el costo del usuario, el
 * de una idea y la tabla de precios. El cliente nunca deriva costos; los muestra tal
 * como llegan. Es un estimado del consumo, no el saldo del proveedor (RNF-17).
 */
@Injectable({ providedIn: 'root' })
export class CostoService {
  private readonly http = inject(HttpClient);

  private readonly costoUsuario = `${environment.baseUrl}/costo`;
  private readonly precios = `${environment.baseUrl}/proveedores/precios`;

  private costoIdeaUrl(ideaId: string): string {
    return `${environment.baseUrl}/ideas/${ideaId}/costo`;
  }

  /** Solicitud del costo total del usuario que consume `httpResource`. */
  solicitudCostoUsuario(): HttpResourceRequest {
    return { url: this.costoUsuario, method: 'GET' };
  }

  /** Solicitud del costo de una idea que consume `httpResource`. */
  solicitudCostoIdea(ideaId: string): HttpResourceRequest {
    return { url: this.costoIdeaUrl(ideaId), method: 'GET' };
  }

  /** Solicitud de la tabla de precios que consume `httpResource`. */
  solicitudPrecios(): HttpResourceRequest {
    return { url: this.precios, method: 'GET' };
  }

  /** `GET /costo` — costo estimado total del usuario, con desglose por idea. */
  costoDelUsuario(): Observable<CostoUsuario> {
    return this.http.get<CostoUsuario>(this.costoUsuario);
  }

  /** `GET /ideas/{id}/costo` — costo estimado de una idea, con desglose por tarea. */
  costoDeIdea(ideaId: string): Observable<CostoIdea> {
    return this.http.get<CostoIdea>(this.costoIdeaUrl(ideaId));
  }

  /** `GET /proveedores/precios` — tabla de precios por modelo. */
  listarPrecios(): Observable<PrecioModelo[]> {
    return this.http.get<PrecioModelo[]>(this.precios);
  }
}
