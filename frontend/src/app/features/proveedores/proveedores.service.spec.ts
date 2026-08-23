import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ConfiguracionByok, ProveedorIA } from '../../core/api/proveedor.model';
import { ProveedoresService } from './proveedores.service';

const CATALOGO = `${environment.baseUrl}/proveedores`;
const CONFIG = `${environment.baseUrl}/proveedores/configuracion`;

const catalogo: ProveedorIA[] = [
  { id: 'anthropic', nombre: 'Anthropic', modelos: [{ id: 'claude', nombre: 'Claude' }] },
];

const config: ConfiguracionByok = {
  proveedor: 'anthropic',
  modeloScoring: 'claude-eco',
  modeloVeredicto: 'claude-pro',
  apiKeyRegistrada: true,
  fechaActualizacion: '2026-08-20T10:00:00.000Z',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(ProveedoresService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('ProveedoresService', () => {
  it('listar hace GET al catálogo de proveedores', () => {
    const { svc, ctrl } = setup();
    svc.listar().subscribe();

    ctrl.expectOne((r) => r.method === 'GET' && r.url === CATALOGO).flush(catalogo);
  });

  it('obtener hace GET a la configuración propia', () => {
    const { svc, ctrl } = setup();
    svc.obtener().subscribe();

    ctrl.expectOne((r) => r.method === 'GET' && r.url === CONFIG).flush(config);
  });

  it('guardar hace PUT con la apiKey en el cuerpo y sin ownerId', () => {
    const { svc, ctrl } = setup();
    svc
      .guardar({
        proveedor: 'anthropic',
        apiKey: 'sk-secreta',
        modeloScoring: 'claude-eco',
        modeloVeredicto: 'claude-pro',
      })
      .subscribe();

    const req = ctrl.expectOne((r) => r.method === 'PUT' && r.url === CONFIG);
    expect(req.request.body).toEqual({
      proveedor: 'anthropic',
      apiKey: 'sk-secreta',
      modeloScoring: 'claude-eco',
      modeloVeredicto: 'claude-pro',
    });
    expect(JSON.stringify(req.request.body)).not.toContain('ownerId');
    // La respuesta nunca trae la key; el servicio no la reexpone.
    req.flush(config);
  });

  it('eliminar hace DELETE de la configuración', () => {
    const { svc, ctrl } = setup();
    svc.eliminar().subscribe();

    ctrl.expectOne((r) => r.method === 'DELETE' && r.url === CONFIG).flush(null, { status: 204, statusText: 'No Content' });
  });

  it('las solicitudes de recurso apuntan a las rutas del contrato', () => {
    const { svc } = setup();

    expect(svc.solicitudCatalogo()).toEqual({ url: CATALOGO, method: 'GET' });
    expect(svc.solicitudConfiguracion()).toEqual({ url: CONFIG, method: 'GET' });
  });
});
