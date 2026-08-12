import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Hipotesis } from '../../../core/api/hipotesis.model';
import { HipotesisService } from './hipotesis.service';

const BASE = `${environment.baseUrl}/ideas/i1/hipotesis`;

const hipotesis: Hipotesis = {
  id: 'h1',
  ideaId: 'i1',
  tipo: 'problema',
  enunciado: 'Los fundadores pierden semanas construyendo antes de validar',
  estado: 'pendiente',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaActualizacion: '2026-01-01T00:00:00.000Z',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(HipotesisService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('HipotesisService', () => {
  it('listar hace GET a la ruta anidada bajo la idea', () => {
    const { svc, ctrl } = setup();
    svc.listar('i1').subscribe();

    const req = ctrl.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush([hipotesis]);
  });

  it('listar no envía parámetros de paginación', () => {
    const { svc, ctrl } = setup();
    svc.listar('i1').subscribe();

    const req = ctrl.expectOne(BASE);
    expect(req.request.params.has('pagina')).toBe(false);
    expect(req.request.params.has('porPagina')).toBe(false);
    req.flush([]);
  });

  it('solicitudLista describe el GET que consume httpResource', () => {
    const { svc } = setup();
    expect(svc.solicitudLista('i1')).toEqual({ url: BASE, method: 'GET' });
  });

  it('crear hace POST con tipo y enunciado, sin ideaId ni ownerId en el cuerpo', () => {
    const { svc, ctrl } = setup();
    svc.crear('i1', { tipo: 'pago', enunciado: 'Pagarían 30 USD al mes' }).subscribe();

    const req = ctrl.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tipo: 'pago', enunciado: 'Pagarían 30 USD al mes' });
    expect(JSON.stringify(req.request.body)).not.toContain('ideaId');
    expect(JSON.stringify(req.request.body)).not.toContain('ownerId');
    req.flush(hipotesis);
  });

  it('actualizar hace PATCH a la hipótesis con solo los cambios', () => {
    const { svc, ctrl } = setup();
    svc.actualizar('i1', 'h1', { enunciado: 'Enunciado corregido' }).subscribe();

    const req = ctrl.expectOne(`${BASE}/h1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ enunciado: 'Enunciado corregido' });
    expect(JSON.stringify(req.request.body)).not.toContain('ideaId');
    req.flush({ ...hipotesis, enunciado: 'Enunciado corregido' });
  });

  it('actualizar solo el estado envía únicamente el estado', () => {
    const { svc, ctrl } = setup();
    svc.actualizar('i1', 'h1', { estado: 'confirmada' }).subscribe();

    const req = ctrl.expectOne(`${BASE}/h1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'confirmada' });
    req.flush({ ...hipotesis, estado: 'confirmada' });
  });

  it('eliminar hace DELETE a la hipótesis', () => {
    const { svc, ctrl } = setup();
    svc.eliminar('i1', 'h1').subscribe();

    const req = ctrl.expectOne(`${BASE}/h1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
