import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Idea } from '../../core/api/idea.model';
import { RespuestaPaginada } from '../../core/api/paginacion.model';
import { IdeasService } from './ideas.service';

const BASE = `${environment.baseUrl}/ideas`;

const idea: Idea = {
  id: 'i1',
  ownerId: 'u1',
  titulo: 'Idea',
  problema: 'Un problema',
  estado: 'borrador',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaActualizacion: '2026-01-01T00:00:00.000Z',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(IdeasService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('IdeasService', () => {
  it('listar propaga pagina/porPagina/estado y no envía ownerId', () => {
    const { svc, ctrl } = setup();
    const pagina: RespuestaPaginada<Idea> = {
      datos: [idea],
      paginacion: { pagina: 1, porPagina: 20, total: 1, totalPaginas: 1 },
    };

    svc.listar({ pagina: 1, porPagina: 20, estado: 'en_validacion' }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'GET' && r.url === BASE);
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('porPagina')).toBe('20');
    expect(req.request.params.get('estado')).toBe('en_validacion');
    expect(req.request.params.has('ownerId')).toBe(false);
    req.flush(pagina);
  });

  it('listar sin estado omite el parámetro', () => {
    const { svc, ctrl } = setup();
    svc.listar({ pagina: 2, porPagina: 10 }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'GET' && r.url === BASE);
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.has('estado')).toBe(false);
    req.flush({ datos: [], paginacion: { pagina: 2, porPagina: 10, total: 0, totalPaginas: 0 } });
  });

  it('crear hace POST a /ideas sin ownerId en el cuerpo', () => {
    const { svc, ctrl } = setup();
    svc.crear({ titulo: 'Idea', problema: 'Un problema' }).subscribe();

    const req = ctrl.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ titulo: 'Idea', problema: 'Un problema' });
    expect(JSON.stringify(req.request.body)).not.toContain('ownerId');
    req.flush(idea);
  });

  it('consultar hace GET a /ideas/{id}', () => {
    const { svc, ctrl } = setup();
    svc.consultar('i1').subscribe();

    const req = ctrl.expectOne(`${BASE}/i1`);
    expect(req.request.method).toBe('GET');
    req.flush(idea);
  });

  it('editar hace PATCH a /ideas/{id} con los cambios', () => {
    const { svc, ctrl } = setup();
    svc.editar('i1', { problema: 'Otro problema' }).subscribe();

    const req = ctrl.expectOne(`${BASE}/i1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ problema: 'Otro problema' });
    req.flush({ ...idea, problema: 'Otro problema' });
  });

  it('archivar hace POST a /ideas/{id}/archivar', () => {
    const { svc, ctrl } = setup();
    svc.archivar('i1').subscribe();

    const req = ctrl.expectOne(`${BASE}/i1/archivar`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...idea, estado: 'archivada' });
  });

  it('desarchivar hace POST a /ideas/{id}/desarchivar', () => {
    const { svc, ctrl } = setup();
    svc.desarchivar('i1').subscribe();

    const req = ctrl.expectOne(`${BASE}/i1/desarchivar`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...idea, estado: 'borrador' });
  });
});
