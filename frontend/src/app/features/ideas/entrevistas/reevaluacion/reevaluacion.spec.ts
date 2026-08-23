import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { EstimacionReevaluacion } from '../../../../core/api/reevaluacion.model';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { ReevaluacionLote } from './reevaluacion';

const EST = '/ideas/i1/entrevistas/reevaluacion/estimacion';
const EXEC = '/ideas/i1/entrevistas/reevaluacion';

function estimacion(parcial: Partial<EstimacionReevaluacion> = {}): EstimacionReevaluacion {
  return {
    entrevistasAfectadas: 3,
    modeloScoring: 'claude-eco',
    moneda: 'USD',
    costoEstimado: 0.12,
    tokensEntradaEstimados: 3000,
    tokensSalidaEstimados: 600,
    esEstimado: true,
    aclaracion: 'Es un estimado del consumo vía ValidaLab, no el saldo de tu cuenta.',
    ...parcial,
  };
}

function setup(): { fixture: ComponentFixture<ReevaluacionLote>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'i1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(ReevaluacionLote);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<ReevaluacionLote>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function texto(fixture: ComponentFixture<ReevaluacionLote>): string {
  return fixture.nativeElement.textContent as string;
}

describe('ReevaluacionLote', () => {
  it('muestra la estimación sin ejecutar, con la aclaración', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(EST) && r.method === 'GET').flush(estimacion());
    await asentar(fixture);

    expect(texto(fixture)).toContain('3');
    expect(texto(fixture)).toContain('claude-eco');
    expect(texto(fixture)).toContain('no el saldo');
  });

  it('sin entrevistas afectadas no ofrece ejecutar', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(EST)).flush(estimacion({ entrevistasAfectadas: 0 }));
    await asentar(fixture);

    expect(texto(fixture)).toContain('todas están al día');
    expect(fixture.nativeElement.querySelector('.boton-primario')).toBeNull();
  });

  it('sin BYOK deshabilita ejecutar y lo explica', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(EST)).flush(estimacion({ modeloScoring: null }));
    await asentar(fixture);

    expect(fixture.nativeElement.querySelector('.boton-primario').disabled).toBe(true);
    expect(texto(fixture)).toContain('Configura tu proveedor de IA (BYOK)');
  });

  it('ejecutar hace POST y muestra el resultado', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(EST)).flush(estimacion());
    await asentar(fixture);

    fixture.nativeElement.querySelector('.boton-primario').click();
    const req = ctrl.expectOne((r) => r.url.endsWith(EXEC) && r.method === 'POST');
    expect(req.request.body).toEqual({});
    req.flush({
      entrevistasReevaluadas: 3,
      entrevistasOmitidas: 1,
      moneda: 'USD',
      costoEstimado: 0.1,
      tokensEntrada: 2800,
      tokensSalida: 560,
    });
    await asentar(fixture);
    // Tras ejecutar, la estimación se recarga.
    ctrl.expectOne((r) => r.url.endsWith(EST) && r.method === 'GET').flush(
      estimacion({ entrevistasAfectadas: 0 }),
    );
    await asentar(fixture);

    expect(texto(fixture)).toContain('Resultado');
    expect(texto(fixture)).toContain('Re-puntuadas');
  });

  it('sin BYOK al ejecutar (409) explica que hay que configurar el proveedor', async () => {
    const { fixture, ctrl } = setup();
    // modeloScoring presente en la estimación pero el POST devuelve 409 igualmente.
    ctrl.expectOne((r) => r.url.endsWith(EST)).flush(estimacion());
    await asentar(fixture);

    fixture.nativeElement.querySelector('.boton-primario').click();
    ctrl
      .expectOne((r) => r.url.endsWith(EXEC) && r.method === 'POST')
      .flush({ codigo: 'CONFLICTO', mensaje: 'sin byok' }, { status: 409, statusText: 'Conflict' });
    await asentar(fixture);

    expect(texto(fixture)).toContain('Configura primero tu proveedor de IA');
  });

  it('un 403 no revela la estimación', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(EST))
      .flush({ codigo: 'ACCESO_DENEGADO', mensaje: 'ajena' }, { status: 403, statusText: 'Forbidden' });
    await asentar(fixture);

    expect(texto(fixture)).toContain('No tienes acceso a esta idea');
  });
});
