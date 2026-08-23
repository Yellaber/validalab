import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Umbral } from '../../../core/api/umbral.model';
import { UmbralesService } from './umbrales.service';

const BASE = `${environment.baseUrl}/ideas/i1/umbrales`;

const umbral: Umbral = {
  kpi: 'tasa_respuesta',
  grupo: 'outreach',
  unidad: 'porcentaje',
  umbralGo: 0.3,
  umbralKill: 0.1,
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(UmbralesService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('UmbralesService', () => {
  it('listar hace GET a la ruta anidada bajo la idea', () => {
    const { svc, ctrl } = setup();
    svc.listar('i1').subscribe();

    const req = ctrl.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush([umbral]);
  });

  it('solicitudLista describe el GET que consume httpResource', () => {
    const { svc } = setup();
    expect(svc.solicitudLista('i1')).toEqual({ url: BASE, method: 'GET' });
  });

  it('fijar hace PUT al KPI con solo los valores editables', () => {
    const { svc, ctrl } = setup();
    svc.fijar('i1', 'tasa_respuesta', { umbralGo: 0.35, umbralKill: 0.15 }).subscribe();

    const req = ctrl.expectOne(`${BASE}/tasa_respuesta`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ umbralGo: 0.35, umbralKill: 0.15 });
    req.flush({ ...umbral, umbralGo: 0.35, umbralKill: 0.15 });
  });

  it('el cuerpo del PUT no lleva kpi, grupo, unidad ni ownerId', () => {
    const { svc, ctrl } = setup();
    svc.fijar('i1', 'volumen_evidencia', { umbralGo: 15 }).subscribe();

    const req = ctrl.expectOne(`${BASE}/volumen_evidencia`);
    const cuerpo = JSON.stringify(req.request.body);
    expect(req.request.body).toEqual({ umbralGo: 15 });
    expect(cuerpo).not.toContain('kpi');
    expect(cuerpo).not.toContain('grupo');
    expect(cuerpo).not.toContain('unidad');
    expect(cuerpo).not.toContain('ownerId');
    req.flush({
      kpi: 'volumen_evidencia',
      grupo: 'calidad_descubrimiento',
      unidad: 'conteo',
      umbralGo: 15,
      umbralKill: null,
    });
  });
});
