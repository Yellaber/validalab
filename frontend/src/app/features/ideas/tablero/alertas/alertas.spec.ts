import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AlertaKpi, KpiCalculado, TableroIdea } from '../../../../core/api/kpi.model';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { AlertasKpi } from './alertas';

const ALERTAS = '/ideas/i1/alertas';

function alerta(parcial: Partial<AlertaKpi> = {}): AlertaKpi {
  return {
    id: 'a1',
    ideaId: 'i1',
    kpi: 'tasa_respuesta',
    tipo: 'kill',
    valor: 0.05,
    umbral: 0.1,
    fecha: '2026-03-12T10:00:00.000Z',
    leida: false,
    ...parcial,
  };
}

function kpi(parcial: Partial<KpiCalculado> = {}): KpiCalculado {
  return {
    kpi: 'tasa_respuesta',
    grupo: 'outreach',
    unidad: 'porcentaje',
    valor: 0.05,
    numerador: 2,
    denominador: 40,
    umbralGo: 0.25,
    umbralKill: 0.1,
    zona: 'kill',
    ...parcial,
  };
}

const tablero: TableroIdea = {
  ideaId: 'i1',
  fechaCalculo: '2026-03-12T10:00:00.000Z',
  resumen: { enZonaGo: 0, enObservacion: 0, enZonaKill: 1, sinDatos: 0, totalKpis: 1 },
  kpis: [kpi()],
};

function pagina(datos: AlertaKpi[], totalPaginas = 1) {
  return { datos, paginacion: { pagina: 1, porPagina: 20, total: datos.length, totalPaginas } };
}

function setup(): { fixture: ComponentFixture<AlertasKpi>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'i1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(AlertasKpi);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<AlertasKpi>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

/** Resuelve el listado y el tablero, que la vista pide para conocer las unidades. */
async function cargar(
  fixture: ComponentFixture<AlertasKpi>,
  ctrl: HttpTestingController,
  datos: AlertaKpi[] = [alerta()],
  totalPaginas = 1,
): Promise<void> {
  ctrl
    .expectOne((r) => r.url.endsWith(ALERTAS) && r.method === 'GET')
    .flush(pagina(datos, totalPaginas));
  ctrl.expectOne((r) => r.url.endsWith('/kpis') && r.method === 'GET').flush(tablero);
  await asentar(fixture);
}

function botonPorTexto(
  fixture: ComponentFixture<AlertasKpi>,
  texto: string,
): HTMLButtonElement | undefined {
  return (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
    (b) => (b.textContent ?? '').includes(texto),
  );
}

function api(fixture: ComponentFixture<AlertasKpi>) {
  return fixture.componentInstance as unknown as { cambiarFiltro(v: string): void };
}

describe('AlertasKpi', () => {
  it('muestra el KPI, el sentido del cruce, el valor y el umbral con su unidad', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    const texto = fixture.nativeElement.querySelector('.alerta')!.textContent as string;
    expect(texto).toContain('Tasa de respuesta');
    expect(texto).toContain('por debajo del umbral kill');
    // Formateado como porcentaje, igual que en el tablero: no «0.05».
    expect(texto).toContain('5%');
    expect(texto).toContain('10%');
    expect(texto).not.toContain('0.05');
  });

  it('un cruce hacia go se explica como oportunidad', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl, [alerta({ tipo: 'go', valor: 0.3, umbral: 0.25 })]);

    const texto = fixture.nativeElement.querySelector('.alerta')!.textContent as string;
    expect(texto).toContain('alcanzando el umbral go');
    expect(texto).toContain('30%');
  });

  it('filtrar por sin leer envía el parámetro y vuelve a la primera página', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl, [alerta()], 3);

    api(fixture).cambiarFiltro('false');
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(ALERTAS));
    expect(req.request.params.get('leida')).toBe('false');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(pagina([]));
    await asentar(fixture);
  });

  it('sin filtro no envía el parámetro leida', async () => {
    const { fixture, ctrl } = setup();

    const req = ctrl.expectOne((r) => r.url.endsWith(ALERTAS));
    expect(req.request.params.has('leida')).toBe(false);
    req.flush(pagina([alerta()]));
    ctrl.expectOne((r) => r.url.endsWith('/kpis')).flush(tablero);
    await asentar(fixture);
  });

  it('marcar como leída envía solo el campo leida y recarga el listado', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    botonPorTexto(fixture, 'Marcar leída')!.click();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(`${ALERTAS}/a1`) && r.method === 'PATCH');
    expect(req.request.body).toEqual({ leida: true });
    req.flush(alerta({ leida: true }));
    await asentar(fixture);

    // Sin estado optimista: se vuelve a pedir el listado.
    ctrl.expectOne((r) => r.url.endsWith(ALERTAS)).flush(pagina([alerta({ leida: true })]));
    await asentar(fixture);

    expect(botonPorTexto(fixture, 'Marcar leída')).toBeUndefined();
  });

  it('una alerta ya leída no ofrece la acción de marcarla', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl, [alerta({ leida: true })]);

    expect(botonPorTexto(fixture, 'Marcar leída')).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.alerta')!.classList).toContain('leida');
  });

  it('no ofrece crear ni eliminar alertas', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    expect(botonPorTexto(fixture, 'Nueva')).toBeUndefined();
    expect(botonPorTexto(fixture, 'Eliminar')).toBeUndefined();
    expect(fixture.nativeElement.textContent).not.toContain('Crear alerta');
  });

  it('sin alertas muestra el estado vacío', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl, []);

    expect(fixture.nativeElement.textContent).toContain('No hay alertas para esta idea');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('un error muestra el aviso con su código y permite reintentar', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(ALERTAS))
      .flush({ codigo: 'ERROR_INTERNO', mensaje: 'boom' }, { status: 500, statusText: 'Error' });
    ctrl.expectOne((r) => r.url.endsWith('/kpis')).flush(tablero);
    await asentar(fixture);

    expect(fixture.nativeElement.querySelector('[role="alert"]')!.textContent).toContain(
      'ERROR_INTERNO',
    );
  });
});
