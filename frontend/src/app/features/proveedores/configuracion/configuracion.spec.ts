import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfiguracionByok, ProveedorIA } from '../../../core/api/proveedor.model';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { ConfiguracionByokComponent } from './configuracion';

const CATALOGO = '/proveedores';
const CONFIG = '/proveedores/configuracion';

const catalogo: ProveedorIA[] = [
  {
    id: 'anthropic',
    nombre: 'Anthropic',
    modelos: [
      { id: 'claude-eco', nombre: 'Claude económico' },
      { id: 'claude-pro', nombre: 'Claude potente' },
    ],
  },
];

const config: ConfiguracionByok = {
  proveedor: 'anthropic',
  modeloScoring: 'claude-eco',
  modeloVeredicto: 'claude-pro',
  apiKeyRegistrada: true,
  fechaActualizacion: '2026-08-20T10:00:00.000Z',
};

function setup(): { fixture: ComponentFixture<ConfiguracionByokComponent>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const fixture = TestBed.createComponent(ConfiguracionByokComponent);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<ConfiguracionByokComponent>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

/** Resuelve el catálogo y la config inicial (por defecto, sin config previa: 404). */
function resolverInicial(
  ctrl: HttpTestingController,
  opciones: { config?: ConfiguracionByok } = {},
): void {
  ctrl.expectOne((r) => r.url.endsWith(CATALOGO) && r.method === 'GET').flush(catalogo);
  const reqConfig = ctrl.expectOne((r) => r.url.endsWith(CONFIG) && r.method === 'GET');
  if (opciones.config) {
    reqConfig.flush(opciones.config);
  } else {
    reqConfig.flush({ codigo: 'RECURSO_NO_ENCONTRADO', mensaje: 'sin config' }, { status: 404, statusText: 'Not Found' });
  }
}

function texto(fixture: ComponentFixture<ConfiguracionByokComponent>): string {
  return fixture.nativeElement.textContent as string;
}

describe('ConfiguracionByokComponent', () => {
  it('muestra los proveedores del catálogo como opciones', async () => {
    const { fixture, ctrl } = setup();
    resolverInicial(ctrl);
    await asentar(fixture);

    expect(texto(fixture)).toContain('Anthropic');
  });

  it('sin configuración previa (404) no muestra error ni aviso de key', async () => {
    const { fixture, ctrl } = setup();
    resolverInicial(ctrl);
    await asentar(fixture);

    expect(texto(fixture)).not.toContain('Ya tienes una API key registrada');
    expect(fixture.nativeElement.querySelector('.error')).toBeNull();
  });

  it('con configuración existente prellena y ofrece revocar', async () => {
    const { fixture, ctrl } = setup();
    resolverInicial(ctrl, { config });
    await asentar(fixture);

    expect(texto(fixture)).toContain('Ya tienes una API key registrada');
    const proveedor = fixture.nativeElement.querySelector('select');
    expect(proveedor.value).toContain('anthropic');
    expect(texto(fixture)).toContain('Revocar configuración');
  });

  it('guardar hace PUT con los valores del formulario', async () => {
    const { fixture, ctrl } = setup();
    resolverInicial(ctrl);
    await asentar(fixture);

    const cmp = fixture.componentInstance as unknown as {
      modelo: { set: (v: unknown) => void };
    };
    cmp.modelo.set({
      proveedor: 'anthropic',
      apiKey: 'sk-secreta',
      modeloScoring: 'claude-eco',
      modeloVeredicto: 'claude-pro',
    });
    await asentar(fixture);

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    const req = ctrl.expectOne((r) => r.url.endsWith(CONFIG) && r.method === 'PUT');
    expect(req.request.body).toEqual({
      proveedor: 'anthropic',
      apiKey: 'sk-secreta',
      modeloScoring: 'claude-eco',
      modeloVeredicto: 'claude-pro',
    });
    req.flush(config);
    await asentar(fixture);
    // Tras guardar, el recurso de config se recarga.
    ctrl.expectOne((r) => r.url.endsWith(CONFIG) && r.method === 'GET').flush(config);
    await asentar(fixture);

    expect(texto(fixture)).toContain('Configuración guardada');
  });

  it('una API key inválida (422) se marca en el campo', async () => {
    const { fixture, ctrl } = setup();
    resolverInicial(ctrl);
    await asentar(fixture);

    const cmp = fixture.componentInstance as unknown as {
      modelo: { set: (v: unknown) => void };
    };
    cmp.modelo.set({
      proveedor: 'anthropic',
      apiKey: 'sk-mala',
      modeloScoring: 'claude-eco',
      modeloVeredicto: 'claude-pro',
    });
    await asentar(fixture);

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    ctrl
      .expectOne((r) => r.url.endsWith(CONFIG) && r.method === 'PUT')
      .flush({ codigo: 'API_KEY_INVALIDA', mensaje: 'rechazada' }, { status: 422, statusText: 'Unprocessable' });
    await asentar(fixture);

    expect(texto(fixture)).toContain('El proveedor rechazó esta API key');
  });

  it('revocar la configuración hace DELETE', async () => {
    const { fixture, ctrl } = setup();
    resolverInicial(ctrl, { config });
    await asentar(fixture);

    // Abre la confirmación y confirma.
    fixture.nativeElement.querySelector('.zona-peligro .boton-secundario').click();
    await asentar(fixture);
    fixture.nativeElement.querySelector('.boton-peligro').click();

    ctrl
      .expectOne((r) => r.url.endsWith(CONFIG) && r.method === 'DELETE')
      .flush(null, { status: 204, statusText: 'No Content' });
    await asentar(fixture);
    // El recurso de config se recarga: ya no hay config.
    ctrl
      .expectOne((r) => r.url.endsWith(CONFIG) && r.method === 'GET')
      .flush({ codigo: 'RECURSO_NO_ENCONTRADO', mensaje: 'sin config' }, { status: 404, statusText: 'Not Found' });
    await asentar(fixture);

    expect(texto(fixture)).not.toContain('Ya tienes una API key registrada');
  });
});
