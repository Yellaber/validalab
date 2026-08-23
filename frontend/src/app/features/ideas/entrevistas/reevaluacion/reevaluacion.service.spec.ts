import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ReevaluacionService } from './reevaluacion.service';

const BASE = `${environment.baseUrl}/ideas/i1/entrevistas/reevaluacion`;

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(ReevaluacionService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('ReevaluacionService', () => {
  it('estimar hace GET a /reevaluacion/estimacion', () => {
    const { svc, ctrl } = setup();
    svc.estimar('i1').subscribe();

    ctrl.expectOne((r) => r.method === 'GET' && r.url === `${BASE}/estimacion`).flush({});
  });

  it('ejecutar sin subconjunto hace POST con cuerpo vacío', () => {
    const { svc, ctrl } = setup();
    svc.ejecutar('i1').subscribe();

    const req = ctrl.expectOne((r) => r.method === 'POST' && r.url === BASE);
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('ejecutar con idsEntrevistas envía el subconjunto', () => {
    const { svc, ctrl } = setup();
    svc.ejecutar('i1', { idsEntrevistas: ['e1', 'e2'] }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'POST' && r.url === BASE);
    expect(req.request.body).toEqual({ idsEntrevistas: ['e1', 'e2'] });
    req.flush({});
  });

  it('la solicitud de estimación apunta a la ruta del contrato', () => {
    const { svc } = setup();

    expect(svc.solicitudEstimacion('i1')).toEqual({
      url: `${BASE}/estimacion`,
      method: 'GET',
    });
  });
});
