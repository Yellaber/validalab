import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { KpiCalculado, TableroIdea } from '../../../../core/api/kpi.model';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { TableroKpis } from './tablero';

const BASE = '/ideas/i1/kpis';

function kpi(parcial: Partial<KpiCalculado> = {}): KpiCalculado {
  return {
    kpi: 'tasa_respuesta',
    grupo: 'outreach',
    unidad: 'porcentaje',
    valor: 0.3,
    numerador: 12,
    denominador: 40,
    umbralGo: 0.25,
    umbralKill: 0.1,
    zona: 'go',
    ...parcial,
  };
}

function tablero(kpis: KpiCalculado[], parcial: Partial<TableroIdea> = {}): TableroIdea {
  return {
    ideaId: 'i1',
    fechaCalculo: '2026-03-12T10:00:00.000Z',
    resumen: {
      enZonaGo: 1,
      enObservacion: 0,
      enZonaKill: 0,
      sinDatos: 0,
      totalKpis: kpis.length,
    },
    kpis,
    ...parcial,
  };
}

function setup(): { fixture: ComponentFixture<TableroKpis>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'i1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(TableroKpis);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<TableroKpis>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function texto(fixture: ComponentFixture<TableroKpis>): string {
  return fixture.nativeElement.textContent as string;
}

describe('TableroKpis', () => {
  it('agrupa los KPIs por grupo, en el orden del catálogo', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET')
      .flush(
        tablero([
          kpi({
            kpi: 'score_promedio_entrevista',
            grupo: 'senal_problema',
            unidad: 'puntaje_0_10',
          }),
          kpi({ kpi: 'tasa_respuesta', grupo: 'outreach' }),
        ]),
      );
    await asentar(fixture);

    const titulos = Array.from(fixture.nativeElement.querySelectorAll('.grupo-kpi h2')).map((h) =>
      (h as HTMLElement).textContent?.trim(),
    );
    // `outreach` va antes que `senal_problema` en el catálogo, aunque llegue después.
    expect(titulos[0]).toBe('Alcance del outreach');
    expect(titulos).toHaveLength(2);
  });

  it('muestra el nombre legible y la fórmula de cada KPI', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(tablero([kpi()]));
    await asentar(fixture);

    expect(texto(fixture)).toContain('Tasa de respuesta');
    expect(texto(fixture)).toContain('Contactos que respondieron / contactados');
  });

  it('un KPI fuera del catálogo se muestra degradando a su clave', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(
        tablero([
          kpi({
            kpi: 'kpi_nuevo' as KpiCalculado['kpi'],
            grupo: 'grupo_nuevo' as KpiCalculado['grupo'],
          }),
        ]),
      );
    await asentar(fixture);

    expect(texto(fixture)).toContain('kpi_nuevo');
    expect(texto(fixture)).toContain('grupo_nuevo');
  });

  it('usa la zona que llega del servidor, sin recalcularla', async () => {
    const { fixture, ctrl } = setup();
    // Valor por encima del umbral go, pero el servidor dice `kill`: manda el servidor.
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(tablero([kpi({ valor: 0.9, umbralGo: 0.25, zona: 'kill' })]));
    await asentar(fixture);

    expect(fixture.nativeElement.querySelector('.fila-kpi')!.classList).toContain('zona-kill');
  });

  describe('falta de evidencia', () => {
    it('un KPI sin datos se explica y no muestra un cero', async () => {
      const { fixture, ctrl } = setup();
      ctrl
        .expectOne((r) => r.url.endsWith(BASE))
        .flush(
          tablero([kpi({ valor: null, numerador: null, denominador: null, zona: 'sin_datos' })]),
        );
      await asentar(fixture);

      const valor = fixture.nativeElement.querySelector('.fila-kpi .valor')!.textContent as string;
      expect(valor).toContain('Sin evidencia suficiente');
      expect(valor).not.toContain('0');
    });

    it('un KPI que vale cero muestra el cero como valor real', async () => {
      const { fixture, ctrl } = setup();
      ctrl
        .expectOne((r) => r.url.endsWith(BASE))
        .flush(tablero([kpi({ valor: 0, numerador: 0, denominador: 40, zona: 'kill' })]));
      await asentar(fixture);

      const valor = fixture.nativeElement.querySelector('.fila-kpi .valor')!.textContent as string;
      expect(valor).toContain('0');
      expect(valor).not.toContain('Sin evidencia');
    });
  });

  describe('transparencia y umbrales', () => {
    it('muestra la fracción cuando el KPI trae numerador y denominador', async () => {
      const { fixture, ctrl } = setup();
      ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(tablero([kpi()]));
      await asentar(fixture);

      expect(texto(fixture)).toContain('(12/40)');
    });

    it('omite la fracción en un KPI de conteo', async () => {
      const { fixture, ctrl } = setup();
      ctrl
        .expectOne((r) => r.url.endsWith(BASE))
        .flush(tablero([kpi({ unidad: 'conteo', valor: 7, numerador: null, denominador: null })]));
      await asentar(fixture);

      expect(fixture.nativeElement.querySelector('.fraccion')).toBeNull();
    });

    it('muestra ambos umbrales cuando el KPI tiene zona kill', async () => {
      const { fixture, ctrl } = setup();
      ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(tablero([kpi()]));
      await asentar(fixture);

      const umbrales = fixture.nativeElement.querySelector('.umbrales')!.textContent as string;
      expect(umbrales).toContain('Kill por debajo de');
      expect(umbrales).toContain('Go desde');
    });

    it('un KPI sin zona kill lo indica y no inventa umbral', async () => {
      const { fixture, ctrl } = setup();
      ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(tablero([kpi({ umbralKill: null })]));
      await asentar(fixture);

      const umbrales = fixture.nativeElement.querySelector('.umbrales')!.textContent as string;
      expect(umbrales).toContain('sin zona kill');
      expect(umbrales).not.toContain('Kill por debajo de');
    });

    it('formatea el valor con la unidad del KPI, como la pantalla de umbrales', async () => {
      const { fixture, ctrl } = setup();
      ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(tablero([kpi({ valor: 0.3 })]));
      await asentar(fixture);

      // `porcentaje` se transporta como ratio y se presenta como porcentaje con su sufijo.
      expect(fixture.nativeElement.querySelector('.fila-kpi .valor')!.textContent).toContain('30%');
    });
  });

  it('muestra el resumen que devuelve el servidor', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(
        tablero([kpi()], {
          resumen: {
            enZonaGo: 3,
            enObservacion: 2,
            enZonaKill: 1,
            sinDatos: 4,
            totalKpis: 10,
          },
        }),
      );
    await asentar(fixture);

    const resumen = fixture.nativeElement.querySelector('.resumen')!.textContent as string;
    expect(resumen).toContain('3');
    expect(resumen).toContain('En zona go');
    expect(resumen).toContain('Sin datos');
    expect(resumen).toContain('10 KPIs');
  });

  it('un error muestra el aviso con su código y permite reintentar', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush({ codigo: 'ERROR_INTERNO', mensaje: 'boom' }, { status: 500, statusText: 'Error' });
    await asentar(fixture);

    expect(fixture.nativeElement.querySelector('[role="alert"]')!.textContent).toContain(
      'ERROR_INTERNO',
    );
  });

  it('un 403 no revela ningún dato de la idea', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(
        { codigo: 'ACCESO_DENEGADO', mensaje: 'ajena' },
        { status: 403, statusText: 'Forbidden' },
      );
    await asentar(fixture);

    expect(texto(fixture)).toContain('No tienes acceso a esta idea');
    expect(fixture.nativeElement.querySelector('.fila-kpi')).toBeNull();
    expect(fixture.nativeElement.querySelector('.resumen')).toBeNull();
  });
});
