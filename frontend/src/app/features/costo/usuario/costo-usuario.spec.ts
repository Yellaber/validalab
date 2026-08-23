import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CostoUsuario, PrecioModelo } from '../../../core/api/costo.model';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { CostoUsuarioComponent } from './costo-usuario';

const COSTO = '/costo';
const PRECIOS = '/proveedores/precios';

const costo: CostoUsuario = {
  moneda: 'USD',
  costoEstimadoTotal: 1.5,
  costoPorIdea: [{ ideaId: 'i1', titulo: 'Mi idea', costoEstimado: 1.5 }],
  proveedor: 'anthropic',
  tokensEntrada: 1000,
  tokensSalida: 200,
  esEstimado: true,
  aclaracion: 'Es un estimado del consumo vía ValidaLab, no el saldo de tu cuenta.',
  urlFacturacion: 'https://console.anthropic.com/billing',
  fechaCalculo: '2026-08-23T10:00:00.000Z',
};

const precios: PrecioModelo[] = [
  {
    proveedor: 'anthropic',
    modeloId: 'claude-eco',
    precioEntradaPorMillon: 3,
    precioSalidaPorMillon: 15,
    precioEntradaCacheadaPorMillon: null,
    moneda: 'USD',
    vigenteDesde: '2026-01-01T00:00:00.000Z',
  },
];

function setup(): { fixture: ComponentFixture<CostoUsuarioComponent>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const fixture = TestBed.createComponent(CostoUsuarioComponent);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<CostoUsuarioComponent>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function texto(fixture: ComponentFixture<CostoUsuarioComponent>): string {
  return fixture.nativeElement.textContent as string;
}

describe('CostoUsuarioComponent', () => {
  it('muestra el total, el desglose por idea y la aclaración normativa', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(COSTO) && r.method === 'GET').flush(costo);
    ctrl.expectOne((r) => r.url.endsWith(PRECIOS) && r.method === 'GET').flush(precios);
    await asentar(fixture);

    expect(texto(fixture)).toContain('1.50');
    expect(texto(fixture)).toContain('Mi idea');
    // Deja claro que es un estimado, no el saldo (RNF-17).
    expect(texto(fixture)).toContain('no el saldo');
  });

  it('muestra la tabla de precios', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(COSTO)).flush(costo);
    ctrl.expectOne((r) => r.url.endsWith(PRECIOS)).flush(precios);
    await asentar(fixture);

    expect(fixture.nativeElement.querySelector('.tabla-precios')).not.toBeNull();
    expect(texto(fixture)).toContain('claude-eco');
  });

  it('ofrece el enlace de facturación para recargar', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(COSTO)).flush(costo);
    ctrl.expectOne((r) => r.url.endsWith(PRECIOS)).flush(precios);
    await asentar(fixture);

    const enlace = fixture.nativeElement.querySelector('a[href^="https://"]');
    expect(enlace.getAttribute('href')).toContain('billing');
  });

  it('un error muestra el aviso con opción de reintentar', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(COSTO))
      .flush({ codigo: 'ERROR_INTERNO', mensaje: 'boom' }, { status: 500, statusText: 'Error' });
    ctrl.expectOne((r) => r.url.endsWith(PRECIOS)).flush(precios);
    await asentar(fixture);

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'ERROR_INTERNO',
    );
  });
});
