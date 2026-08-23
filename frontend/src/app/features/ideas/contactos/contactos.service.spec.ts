import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Contacto } from '../../../core/api/contacto.model';
import { ContactosService } from './contactos.service';

const BASE = `${environment.baseUrl}/ideas/i1/contactos`;

const contacto: Contacto = {
  id: 'c1',
  ideaId: 'i1',
  nombre: 'Ana Ruiz',
  perfil: 'CTO en fintech',
  canal: 'linkedin',
  origen: 'busqueda_directa',
  referidoPorId: null,
  estado: 'por_contactar',
  primerToqueEn: null,
  segundoToqueEn: null,
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaActualizacion: '2026-01-01T00:00:00.000Z',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(ContactosService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('ContactosService', () => {
  it('listar propaga pagina/porPagina/estado y no envía ownerId', () => {
    const { svc, ctrl } = setup();
    svc.listar('i1', { pagina: 1, porPagina: 20, estado: 'respondio' }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'GET' && r.url === BASE);
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('porPagina')).toBe('20');
    expect(req.request.params.get('estado')).toBe('respondio');
    expect(req.request.params.has('ownerId')).toBe(false);
    req.flush({
      datos: [contacto],
      paginacion: { pagina: 1, porPagina: 20, total: 1, totalPaginas: 1 },
    });
  });

  it('listar sin filtro omite el parámetro estado', () => {
    const { svc, ctrl } = setup();
    svc.listar('i1', { pagina: 1, porPagina: 20 }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'GET' && r.url === BASE);
    expect(req.request.params.has('estado')).toBe(false);
    req.flush({ datos: [], paginacion: { pagina: 1, porPagina: 20, total: 0, totalPaginas: 0 } });
  });

  it('crear hace POST sin ideaId, ownerId, estado ni toques en el cuerpo', () => {
    const { svc, ctrl } = setup();
    svc
      .crear('i1', { nombre: 'Ana Ruiz', canal: 'linkedin', origen: 'busqueda_directa' })
      .subscribe();

    const req = ctrl.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    const cuerpo = JSON.stringify(req.request.body);
    expect(cuerpo).not.toContain('ideaId');
    expect(cuerpo).not.toContain('ownerId');
    expect(cuerpo).not.toContain('estado');
    expect(cuerpo).not.toContain('ToqueEn');
    req.flush(contacto);
  });

  it('consultar hace GET al contacto', () => {
    const { svc, ctrl } = setup();
    svc.consultar('i1', 'c1').subscribe();

    const req = ctrl.expectOne(`${BASE}/c1`);
    expect(req.request.method).toBe('GET');
    req.flush(contacto);
  });

  it('editar hace PATCH con solo los cambios de contenido', () => {
    const { svc, ctrl } = setup();
    svc.editar('i1', 'c1', { perfil: 'VP de Ingeniería' }).subscribe();

    const req = ctrl.expectOne(`${BASE}/c1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ perfil: 'VP de Ingeniería' });
    req.flush({ ...contacto, perfil: 'VP de Ingeniería' });
  });

  it('eliminar hace DELETE al contacto', () => {
    const { svc, ctrl } = setup();
    svc.eliminar('i1', 'c1').subscribe();

    const req = ctrl.expectOne(`${BASE}/c1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('transicionar hace POST a /estado con solo el estado destino', () => {
    const { svc, ctrl } = setup();
    svc.transicionar('i1', 'c1', 'contactado').subscribe();

    const req = ctrl.expectOne(`${BASE}/c1/estado`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ estado: 'contactado' });
    req.flush({ ...contacto, estado: 'contactado' });
  });

  it('registrar toque sin fecha envía un cuerpo vacío, para que el reloj sea el del servidor', () => {
    const { svc, ctrl } = setup();
    svc.registrarToque('i1', 'c1').subscribe();

    const req = ctrl.expectOne(`${BASE}/c1/toques`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ ...contacto, primerToqueEn: '2026-03-12T10:00:00.000Z' });
  });

  it('registrar toque con fecha la incluye en el cuerpo', () => {
    const { svc, ctrl } = setup();
    svc.registrarToque('i1', 'c1', '2026-03-12T10:00:00.000Z').subscribe();

    const req = ctrl.expectOne(`${BASE}/c1/toques`);
    expect(req.request.body).toEqual({ fecha: '2026-03-12T10:00:00.000Z' });
    req.flush({ ...contacto, primerToqueEn: '2026-03-12T10:00:00.000Z' });
  });

  it('las solicitudes de httpResource describen las rutas del contrato', () => {
    const { svc } = setup();
    expect(svc.solicitudDetalle('i1', 'c1')).toEqual({ url: `${BASE}/c1`, method: 'GET' });
    expect(svc.solicitudListado('i1', { pagina: 2, porPagina: 10 })).toEqual({
      url: BASE,
      method: 'GET',
      params: { pagina: 2, porPagina: 10 },
    });
  });
});
