import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Entrevista } from '../../../core/api/entrevista.model';
import { EntrevistasService } from './entrevistas.service';

const BASE = `${environment.baseUrl}/ideas/i1/entrevistas`;

const entrevista: Entrevista = {
  id: 'e1',
  ideaId: 'i1',
  contactoId: 'c1',
  guionId: 'g1',
  respuestas: [{ preguntaId: 'p1', texto: 'Lo resuelvo a mano' }],
  citas: [],
  estadoScoring: 'pendiente',
  score: null,
  ajuste: null,
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaActualizacion: '2026-01-01T00:00:00.000Z',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(EntrevistasService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('EntrevistasService', () => {
  it('listar propaga pagina y porPagina', () => {
    const { svc, ctrl } = setup();
    svc.listar('i1', { pagina: 2, porPagina: 20 }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'GET' && r.url === BASE);
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('porPagina')).toBe('20');
    req.flush({ datos: [], paginacion: { pagina: 2, porPagina: 20, total: 0, totalPaginas: 0 } });
  });

  it('listar propaga ambos filtros del contrato cuando están presentes', () => {
    const { svc, ctrl } = setup();
    svc
      .listar('i1', { pagina: 1, porPagina: 20, contactoId: 'c9', estadoScoring: 'puntuada' })
      .subscribe();

    const req = ctrl.expectOne((r) => r.method === 'GET' && r.url === BASE);
    expect(req.request.params.get('contactoId')).toBe('c9');
    expect(req.request.params.get('estadoScoring')).toBe('puntuada');
    req.flush({ datos: [], paginacion: { pagina: 1, porPagina: 20, total: 0, totalPaginas: 0 } });
  });

  it('listar sin filtros omite ambos parámetros', () => {
    const { svc, ctrl } = setup();
    svc.listar('i1', { pagina: 1, porPagina: 20 }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'GET' && r.url === BASE);
    expect(req.request.params.has('contactoId')).toBe(false);
    expect(req.request.params.has('estadoScoring')).toBe(false);
    req.flush({ datos: [], paginacion: { pagina: 1, porPagina: 20, total: 0, totalPaginas: 0 } });
  });

  it('crear hace POST sin ideaId, ownerId ni score en el cuerpo', () => {
    const { svc, ctrl } = setup();
    svc
      .crear('i1', {
        contactoId: 'c1',
        guionId: 'g1',
        respuestas: [{ preguntaId: 'p1', texto: 'Lo resuelvo a mano' }],
      })
      .subscribe();

    const req = ctrl.expectOne((r) => r.method === 'POST' && r.url === BASE);
    const cuerpo = JSON.stringify(req.request.body);
    expect(cuerpo).not.toContain('ideaId');
    expect(cuerpo).not.toContain('ownerId');
    expect(cuerpo).not.toContain('score');
    req.flush(entrevista);
  });

  it('consultar hace GET en el recurso individual', () => {
    const { svc, ctrl } = setup();
    svc.consultar('i1', 'e1').subscribe();

    ctrl.expectOne((r) => r.method === 'GET' && r.url === `${BASE}/e1`).flush(entrevista);
  });

  it('editar hace PATCH y su cuerpo no admite contactoId ni guionId', () => {
    const { svc, ctrl } = setup();
    svc.editar('i1', 'e1', { respuestas: [{ preguntaId: 'p1', texto: 'Corregido' }] }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'PATCH' && r.url === `${BASE}/e1`);
    const cuerpo = JSON.stringify(req.request.body);
    expect(cuerpo).not.toContain('contactoId');
    expect(cuerpo).not.toContain('guionId');
    req.flush(entrevista);
  });

  it('eliminar hace DELETE en el recurso individual', () => {
    const { svc, ctrl } = setup();
    svc.eliminar('i1', 'e1').subscribe();

    ctrl.expectOne((r) => r.method === 'DELETE' && r.url === `${BASE}/e1`).flush(null);
  });

  it('no expone las acciones de scoring: son del change siguiente', () => {
    const { svc } = setup();
    const api = svc as unknown as Record<string, unknown>;

    expect(api['puntuar']).toBeUndefined();
    expect(api['ajustarScore']).toBeUndefined();
  });

  it('las solicitudes para httpResource apuntan a la ruta correcta', () => {
    const { svc } = setup();

    expect(svc.solicitudDetalle('i1', 'e1')).toEqual({ url: `${BASE}/e1`, method: 'GET' });
    expect(svc.solicitudListado('i1', { pagina: 1, porPagina: 20 })).toEqual({
      url: BASE,
      method: 'GET',
      params: { pagina: 1, porPagina: 20 },
    });
  });
});
