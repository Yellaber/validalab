import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CostoService } from './costo.service';

const BASE = environment.baseUrl;

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(CostoService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('CostoService', () => {
  it('costoDelUsuario hace GET a /costo', () => {
    const { svc, ctrl } = setup();
    svc.costoDelUsuario().subscribe();

    ctrl.expectOne((r) => r.method === 'GET' && r.url === `${BASE}/costo`).flush({});
  });

  it('costoDeIdea hace GET a /ideas/{id}/costo', () => {
    const { svc, ctrl } = setup();
    svc.costoDeIdea('i1').subscribe();

    ctrl.expectOne((r) => r.method === 'GET' && r.url === `${BASE}/ideas/i1/costo`).flush({});
  });

  it('listarPrecios hace GET a /proveedores/precios', () => {
    const { svc, ctrl } = setup();
    svc.listarPrecios().subscribe();

    ctrl.expectOne((r) => r.method === 'GET' && r.url === `${BASE}/proveedores/precios`).flush([]);
  });

  it('las solicitudes de recurso apuntan a las rutas del contrato', () => {
    const { svc } = setup();

    expect(svc.solicitudCostoUsuario()).toEqual({ url: `${BASE}/costo`, method: 'GET' });
    expect(svc.solicitudCostoIdea('i1')).toEqual({ url: `${BASE}/ideas/i1/costo`, method: 'GET' });
    expect(svc.solicitudPrecios()).toEqual({ url: `${BASE}/proveedores/precios`, method: 'GET' });
  });
});
