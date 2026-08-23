import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Veredicto } from '../../../core/api/veredicto.model';
import { VeredictoService } from './veredicto.service';

const BASE = `${environment.baseUrl}/ideas/i1/veredictos`;

const veredicto: Veredicto = {
  id: 'v1',
  ideaId: 'i1',
  veredicto: 'go',
  confianza: 82,
  justificacionPorKPI: [{ kpi: 'tasa_respuesta', lectura: 'Buen alcance.' }],
  recomendaciones: ['Sigue entrevistando.'],
  proveedor: 'anthropic',
  modelo: 'claude',
  snapshotKpis: [],
  estadoVerificacion: 'pendiente',
  verificacion: null,
  fechaEmision: '2026-08-20T10:00:00.000Z',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(VeredictoService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('VeredictoService', () => {
  it('emitir hace POST sin cuerpo de negocio ni ownerId', () => {
    const { svc, ctrl } = setup();
    svc.emitir('i1').subscribe();

    const req = ctrl.expectOne((r) => r.method === 'POST' && r.url === BASE);
    expect(req.request.body).toEqual({});
    expect(JSON.stringify(req.request.body)).not.toContain('ownerId');
    req.flush(veredicto);
  });

  it('listar hace GET con pagina y porPagina', () => {
    const { svc, ctrl } = setup();
    svc.listar('i1', { pagina: 2, porPagina: 20 }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'GET' && r.url === BASE);
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('porPagina')).toBe('20');
    req.flush({ datos: [], paginacion: { pagina: 2, porPagina: 20, total: 0, totalPaginas: 0 } });
  });

  it('verificar aprobar hace POST a /verificacion con el resultado', () => {
    const { svc, ctrl } = setup();
    svc.verificar('i1', 'v1', { resultado: 'aprobado' }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'POST' && r.url === `${BASE}/v1/verificacion`);
    expect(req.request.body).toEqual({ resultado: 'aprobado' });
    expect(JSON.stringify(req.request.body)).not.toContain('ownerId');
    req.flush({ ...veredicto, estadoVerificacion: 'aprobado' });
  });

  it('verificar anular envía el resultado y la nota', () => {
    const { svc, ctrl } = setup();
    svc.verificar('i1', 'v1', { resultado: 'anulado', nota: 'No convence' }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'POST' && r.url === `${BASE}/v1/verificacion`);
    expect(req.request.body).toEqual({ resultado: 'anulado', nota: 'No convence' });
    req.flush({ ...veredicto, estadoVerificacion: 'anulado' });
  });

  it('la solicitud del historial apunta a la ruta con paginación', () => {
    const { svc } = setup();

    expect(svc.solicitudHistorial('i1', { pagina: 1, porPagina: 20 })).toEqual({
      url: BASE,
      method: 'GET',
      params: { pagina: 1, porPagina: 20 },
    });
  });

  it('la solicitud del detalle apunta al veredicto concreto', () => {
    const { svc } = setup();

    expect(svc.solicitudDetalle('i1', 'v1')).toEqual({ url: `${BASE}/v1`, method: 'GET' });
  });
});
