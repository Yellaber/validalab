import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Guion } from '../../core/api/guion.model';
import { GuionesService } from './guiones.service';

const BASE = `${environment.baseUrl}/guiones`;

const guion: Guion = {
  id: 'g1',
  ownerId: 'u1',
  nombre: 'Descubrimiento de dolor',
  descripcion: 'Guión base para entrevistas en frío',
  preguntas: [
    { id: 'p1', orden: 1, texto: '¿Cómo resuelves esto hoy?' },
    { id: 'p2', orden: 2, texto: '¿Cuánto te cuesta?' },
  ],
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaActualizacion: '2026-01-01T00:00:00.000Z',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(GuionesService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('GuionesService', () => {
  it('listar propaga pagina/porPagina y no envía ownerId', () => {
    const { svc, ctrl } = setup();
    svc.listar({ pagina: 2, porPagina: 20 }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'GET' && r.url === BASE);
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('porPagina')).toBe('20');
    expect(req.request.params.has('ownerId')).toBe(false);
    req.flush({
      datos: [guion],
      paginacion: { pagina: 2, porPagina: 20, total: 1, totalPaginas: 1 },
    });
  });

  it('la ruta base no cuelga de ninguna idea', () => {
    const { svc, ctrl } = setup();
    svc.listar({ pagina: 1, porPagina: 20 }).subscribe();

    const req = ctrl.expectOne((r) => r.method === 'GET');
    expect(req.request.url).not.toContain('/ideas');
    req.flush({ datos: [], paginacion: { pagina: 1, porPagina: 20, total: 0, totalPaginas: 0 } });
  });

  it('crear hace POST en la colección sin ownerId en el cuerpo', () => {
    const { svc, ctrl } = setup();
    svc
      .crear({
        nombre: 'Descubrimiento de dolor',
        preguntas: [{ orden: 1, texto: '¿Cómo resuelves esto hoy?' }],
      })
      .subscribe();

    const req = ctrl.expectOne((r) => r.method === 'POST' && r.url === BASE);
    expect(req.request.body).toEqual({
      nombre: 'Descubrimiento de dolor',
      preguntas: [{ orden: 1, texto: '¿Cómo resuelves esto hoy?' }],
    });
    expect(JSON.stringify(req.request.body)).not.toContain('ownerId');
    req.flush(guion);
  });

  it('consultar hace GET en el recurso individual', () => {
    const { svc, ctrl } = setup();
    svc.consultar('g1').subscribe();

    ctrl.expectOne((r) => r.method === 'GET' && r.url === `${BASE}/g1`).flush(guion);
  });

  it('editar hace PATCH con el conjunto ordenado completo y sin ownerId', () => {
    const { svc, ctrl } = setup();
    svc
      .editar('g1', {
        nombre: 'Descubrimiento de dolor',
        preguntas: [
          { orden: 1, texto: '¿Cómo resuelves esto hoy?' },
          { orden: 2, texto: '¿Cuánto te cuesta?' },
        ],
      })
      .subscribe();

    const req = ctrl.expectOne((r) => r.method === 'PATCH' && r.url === `${BASE}/g1`);
    expect(req.request.body.preguntas).toHaveLength(2);
    expect(JSON.stringify(req.request.body)).not.toContain('ownerId');
    req.flush(guion);
  });

  it('eliminar hace DELETE en el recurso individual', () => {
    const { svc, ctrl } = setup();
    svc.eliminar('g1').subscribe();

    ctrl.expectOne((r) => r.method === 'DELETE' && r.url === `${BASE}/g1`).flush(null);
  });

  it('las solicitudes para httpResource apuntan a la ruta correcta', () => {
    const { svc } = setup();

    expect(svc.solicitudListado({ pagina: 1, porPagina: 20 })).toEqual({
      url: BASE,
      method: 'GET',
      params: { pagina: 1, porPagina: 20 },
    });
    expect(svc.solicitudDetalle('g1')).toEqual({ url: `${BASE}/g1`, method: 'GET' });
  });
});
