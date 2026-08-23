import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ConfiguracionByok,
  GuardarByokRequest,
  ProveedorIA,
} from '../../core/api/proveedor.model';
import { environment } from '../../../environments/environment';

/**
 * Servicio de recurso del proveedor de IA (BYOK) del usuario (tag `proveedores`,
 * épica E7).
 *
 * El **catálogo** es global (curado por administración); la **configuración** es del
 * usuario. La `apiKey` se envía al guardar pero nunca vuelve (RNF-07): el servicio
 * jamás la lee de una respuesta.
 */
@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly http = inject(HttpClient);

  private readonly catalogo = `${environment.baseUrl}/proveedores`;
  private readonly config = `${environment.baseUrl}/proveedores/configuracion`;

  /** Solicitud del catálogo de proveedores que consume `httpResource`. */
  solicitudCatalogo(): HttpResourceRequest {
    return { url: this.catalogo, method: 'GET' };
  }

  /** Solicitud de la configuración BYOK propia que consume `httpResource`. */
  solicitudConfiguracion(): HttpResourceRequest {
    return { url: this.config, method: 'GET' };
  }

  /** `GET /proveedores` — catálogo curado de proveedores y modelos. */
  listar(): Observable<ProveedorIA[]> {
    return this.http.get<ProveedorIA[]>(this.catalogo);
  }

  /** `GET /proveedores/configuracion` — config BYOK propia (sin la API key); 404 si no hay. */
  obtener(): Observable<ConfiguracionByok> {
    return this.http.get<ConfiguracionByok>(this.config);
  }

  /**
   * `PUT /proveedores/configuracion` — crea o reemplaza la config BYOK. Key inválida
   * → 422 API_KEY_INVALIDA; modelo fuera del catálogo → 422 VALIDACION_FALLIDA;
   * proveedor no disponible durante la validación → 503.
   */
  guardar(cuerpo: GuardarByokRequest): Observable<ConfiguracionByok> {
    return this.http.put<ConfiguracionByok>(this.config, cuerpo);
  }

  /** `DELETE /proveedores/configuracion` — revoca la config BYOK y su credencial. */
  eliminar(): Observable<void> {
    return this.http.delete<void>(this.config);
  }
}
