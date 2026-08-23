import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AlertaKpi, TableroIdea } from '../../../core/api/kpi.model';
import { TableroService } from './tablero.service';

const BASE = `${environment.baseUrl}/ideas/i1`;

const tablero: TableroIdea = {
  ideaId: 'i1',
  fechaCalculo: '2026-03-12T10:00:00.000Z',
  resumen: { enZonaGo: 1, enObservacion: 0, enZonaKill: 0, sinDatos: 0, totalKpis: 1 },
  kpis: [
    {
      kpi: 'tasa_respuesta',
      grupo: 'outreach',
      unidad: 'porcentaje',
      valor: 0.3,
      numerador: 12,
      denominador: 40,
      umbralGo: 0.25,
      umbralKill: 0.1,
      zona: 'go',
    },
  ],
};

const alerta: AlertaKpi = {
  id: 'a1',
  ideaId: 'i1',
  kpi: 'tasa_respuesta',
  tipo: 'kill',
  valor: 0.05,
  umbral: 0.1,
  fecha: '2026-03-12T10:00:00.000Z',
  leida: false,
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(TableroService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('TableroService', () => {
  it('consultarTablero hace GET en la ruta de KPIs de la idea', () => {
    const { svc, ctrl } = setup();
    svc.consultarTablero('i1').subscribe();

    ctrl.expectOne((r) => r.method === 'GET' && r.url === `${BASE}/kpis`).flush(tablero);
  });

  it('marcarLeida hace PATCH con un cuerpo limitado a leida', () => {
    const { svc, ctrl } = setup();
    svc.marcarLeida('i1', 'a1').subscribe();

    const req = ctrl.expectOne((r) => r.method === 'PATCH' && r.url === `${BASE}/alertas/a1`);
    expect(req.request.body).toEqual({ leida: true });
    // Nada del contenido de la alerta viaja de vuelta: lo produce el sistema.
    const cuerpo = JSON.stringify(req.request.body);
    expect(cuerpo).not.toContain('ideaId');
    expect(cuerpo).not.toContain('kpi');
    expect(cuerpo).not.toContain('valor');
    expect(cuerpo).not.toContain('umbral');
    req.flush(alerta);
  });

  it('la solicitud de alertas propaga pagina, porPagina y el filtro leida', () => {
    const { svc } = setup();

    expect(svc.solicitudAlertas('i1', { pagina: 2, porPagina: 20, leida: false })).toEqual({
      url: `${BASE}/alertas`,
      method: 'GET',
      params: { pagina: 2, porPagina: 20, leida: false },
    });
  });

  it('sin filtro, la solicitud de alertas omite el parámetro leida', () => {
    const { svc } = setup();
    const solicitud = svc.solicitudAlertas('i1', { pagina: 1, porPagina: 20 });

    expect(solicitud.params).toEqual({ pagina: 1, porPagina: 20 });
  });

  it('la solicitud del tablero apunta a la ruta correcta', () => {
    const { svc } = setup();

    expect(svc.solicitudTablero('i1')).toEqual({ url: `${BASE}/kpis`, method: 'GET' });
  });

  it('no expone acciones para crear ni eliminar alertas', () => {
    const { svc } = setup();
    const api = svc as unknown as Record<string, unknown>;

    expect(api['crearAlerta']).toBeUndefined();
    expect(api['eliminarAlerta']).toBeUndefined();
  });
});
