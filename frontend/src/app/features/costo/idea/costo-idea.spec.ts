import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { CostoIdea } from '../../../core/api/costo.model';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { CostoIdeaComponent } from './costo-idea';

const BASE = '/ideas/i1/costo';

const costo: CostoIdea = {
  ideaId: 'i1',
  proveedor: 'anthropic',
  moneda: 'USD',
  costoEstimadoTotal: 0.42,
  desglosePorTarea: [
    { tarea: 'scoring', llamadas: 8, tokensEntrada: 4000, tokensSalida: 800, costoEstimado: 0.3 },
    { tarea: 'veredicto', llamadas: 1, tokensEntrada: 2000, tokensSalida: 400, costoEstimado: 0.12 },
  ],
  tokensEntrada: 6000,
  tokensSalida: 1200,
  llamadas: 9,
  esEstimado: true,
  aclaracion: 'Es un estimado del consumo vía ValidaLab, no el saldo de tu cuenta.',
  urlFacturacion: 'https://console.anthropic.com/billing',
  fechaCalculo: '2026-08-23T10:00:00.000Z',
};

function setup(): { fixture: ComponentFixture<CostoIdeaComponent>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'i1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(CostoIdeaComponent);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<CostoIdeaComponent>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function texto(fixture: ComponentFixture<CostoIdeaComponent>): string {
  return fixture.nativeElement.textContent as string;
}

describe('CostoIdeaComponent', () => {
  it('muestra el total y el desglose por tarea con nombres legibles', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush(costo);
    await asentar(fixture);

    expect(texto(fixture)).toContain('0.42');
    expect(texto(fixture)).toContain('Scoring de entrevistas');
    expect(texto(fixture)).toContain('Veredicto de idea');
    expect(texto(fixture)).toContain('no el saldo');
  });

  it('un 403 no revela datos de la idea', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush({ codigo: 'ACCESO_DENEGADO', mensaje: 'ajena' }, { status: 403, statusText: 'Forbidden' });
    await asentar(fixture);

    expect(texto(fixture)).toContain('No tienes acceso a esta idea');
    expect(fixture.nativeElement.querySelector('.tabla-costo')).toBeNull();
  });

  it('un 404 se muestra como idea inexistente', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush({ codigo: 'RECURSO_NO_ENCONTRADO', mensaje: 'no existe' }, { status: 404, statusText: 'Not Found' });
    await asentar(fixture);

    expect(texto(fixture)).toContain('Esta idea no existe');
  });
});
