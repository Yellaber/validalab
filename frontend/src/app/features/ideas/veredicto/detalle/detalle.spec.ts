import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Veredicto } from '../../../../core/api/veredicto.model';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { DetalleVeredicto } from './detalle';

const BASE = '/ideas/i1/veredictos/v1';

function veredicto(parcial: Partial<Veredicto> = {}): Veredicto {
  return {
    id: 'v1',
    ideaId: 'i1',
    veredicto: 'go',
    confianza: 82,
    justificacionPorKPI: [{ kpi: 'tasa_respuesta', lectura: 'Buen alcance del outreach.' }],
    recomendaciones: ['Sigue entrevistando al segmento.'],
    proveedor: 'anthropic',
    modelo: 'claude',
    snapshotKpis: [
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
    estadoVerificacion: 'pendiente',
    verificacion: null,
    fechaEmision: '2026-08-20T10:00:00.000Z',
    ...parcial,
  };
}

function setup(): { fixture: ComponentFixture<DetalleVeredicto>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: { get: (k: string) => (k === 'idVeredicto' ? 'v1' : 'i1') },
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(DetalleVeredicto);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<DetalleVeredicto>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function texto(fixture: ComponentFixture<DetalleVeredicto>): string {
  return fixture.nativeElement.textContent as string;
}

describe('DetalleVeredicto', () => {
  it('muestra el juicio, el razonamiento por KPI y el snapshot', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush(veredicto());
    await asentar(fixture);

    expect(texto(fixture)).toContain('Continuar (go)');
    expect(texto(fixture)).toContain('Confianza 82%');
    // El nombre legible del KPI sale del catálogo compartido con umbrales/tablero.
    expect(texto(fixture)).toContain('Tasa de respuesta');
    expect(texto(fixture)).toContain('Buen alcance del outreach.');
    expect(texto(fixture)).toContain('Sigue entrevistando al segmento.');
  });

  it('un veredicto pendiente ofrece aprobar y anular', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(veredicto());
    await asentar(fixture);

    expect(fixture.nativeElement.querySelector('.boton-primario').textContent).toContain('Aprobar');
  });

  it('aprobar hace POST a /verificacion con resultado aprobado', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(veredicto());
    await asentar(fixture);

    fixture.nativeElement.querySelector('.boton-primario').click();
    const req = ctrl.expectOne(
      (r) => r.url.endsWith(`${BASE}/verificacion`) && r.method === 'POST',
    );
    expect(req.request.body).toEqual({ resultado: 'aprobado' });
    req.flush(veredicto({ estadoVerificacion: 'aprobado' }));
    await asentar(fixture);
    // El recurso se recarga tras verificar.
    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush(
      veredicto({
        estadoVerificacion: 'aprobado',
        verificacion: { resultado: 'aprobado', fecha: '2026-08-21T00:00:00.000Z' },
      }),
    );
    await asentar(fixture);

    expect(texto(fixture)).toContain('Aprobado');
  });

  it('anular exige una nota antes de enviar', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(veredicto());
    await asentar(fixture);

    // Abre el formulario de anulación (segundo botón: Anular).
    fixture.nativeElement.querySelectorAll('.boton-secundario')[1].click();
    await asentar(fixture);
    // Enviar sin nota no dispara ninguna petición: el formulario es inválido.
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await asentar(fixture);
    ctrl.expectNone((r) => r.method === 'POST');

    // Con nota, envía resultado anulado + nota.
    const textarea = fixture.nativeElement.querySelector('textarea');
    textarea.value = 'No convence la evidencia';
    textarea.dispatchEvent(new Event('input'));
    await asentar(fixture);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    const req = ctrl.expectOne((r) => r.url.endsWith(`${BASE}/verificacion`) && r.method === 'POST');
    expect(req.request.body).toEqual({ resultado: 'anulado', nota: 'No convence la evidencia' });
    req.flush(veredicto({ estadoVerificacion: 'anulado' }));
    await asentar(fixture);
    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush(
      veredicto({
        estadoVerificacion: 'anulado',
        verificacion: {
          resultado: 'anulado',
          nota: 'No convence la evidencia',
          fecha: '2026-08-21T00:00:00.000Z',
        },
      }),
    );
    await asentar(fixture);
  });

  it('un veredicto ya verificado no ofrece acciones', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(
      veredicto({
        estadoVerificacion: 'aprobado',
        verificacion: { resultado: 'aprobado', fecha: '2026-08-21T00:00:00.000Z' },
      }),
    );
    await asentar(fixture);

    expect(fixture.nativeElement.querySelector('.boton-primario')).toBeNull();
    expect(texto(fixture)).toContain('Aprobado');
  });
});
