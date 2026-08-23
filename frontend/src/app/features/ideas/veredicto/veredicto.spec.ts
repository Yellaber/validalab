import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { RespuestaPaginada } from '../../../core/api/paginacion.model';
import { Veredicto } from '../../../core/api/veredicto.model';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { VeredictosIdea } from './veredicto';

const BASE = '/ideas/i1/veredictos';

function veredicto(parcial: Partial<Veredicto> = {}): Veredicto {
  return {
    id: 'v1',
    ideaId: 'i1',
    veredicto: 'go',
    confianza: 82,
    justificacionPorKPI: [],
    recomendaciones: [],
    proveedor: 'anthropic',
    modelo: 'claude',
    snapshotKpis: [],
    estadoVerificacion: 'pendiente',
    verificacion: null,
    fechaEmision: '2026-08-20T10:00:00.000Z',
    ...parcial,
  };
}

function pagina(datos: Veredicto[]): RespuestaPaginada<Veredicto> {
  return {
    datos,
    paginacion: { pagina: 1, porPagina: 20, total: datos.length, totalPaginas: 1 },
  };
}

function setup(): {
  fixture: ComponentFixture<VeredictosIdea>;
  ctrl: HttpTestingController;
  router: Router;
} {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'i1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(VeredictosIdea);
  const ctrl = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  fixture.detectChanges();
  return { fixture, ctrl, router };
}

async function asentar(fixture: ComponentFixture<VeredictosIdea>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function texto(fixture: ComponentFixture<VeredictosIdea>): string {
  return fixture.nativeElement.textContent as string;
}

describe('VeredictosIdea', () => {
  it('lista el historial de veredictos', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET')
      .flush(pagina([veredicto({ confianza: 82 })]));
    await asentar(fixture);

    expect(texto(fixture)).toContain('Continuar (go)');
    expect(texto(fixture)).toContain('Confianza 82%');
  });

  it('muestra un estado vacío cuando no hay veredictos', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([]));
    await asentar(fixture);

    expect(texto(fixture)).toContain('Aún no has emitido ningún veredicto');
  });

  it('emitir invoca al agente y navega al veredicto nuevo', async () => {
    const { fixture, ctrl, router } = setup();
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush(pagina([]));
    await asentar(fixture);

    fixture.nativeElement.querySelector('.boton-primario').click();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'POST')
      .flush(veredicto({ id: 'v-nuevo' }));
    await asentar(fixture);

    expect(navegar).toHaveBeenCalledWith(['/ideas', 'i1', 'veredictos', 'v-nuevo']);
  });

  it('sin BYOK (409) explica que hay que configurar el proveedor', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush(pagina([]));
    await asentar(fixture);

    fixture.nativeElement.querySelector('.boton-primario').click();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'POST')
      .flush({ codigo: 'CONFLICTO', mensaje: 'sin byok' }, { status: 409, statusText: 'Conflict' });
    await asentar(fixture);

    expect(texto(fixture)).toContain('Configura primero tu proveedor de IA');
  });

  it('un 403 no revela el historial', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush({ codigo: 'ACCESO_DENEGADO', mensaje: 'ajena' }, { status: 403, statusText: 'Forbidden' });
    await asentar(fixture);

    expect(texto(fixture)).toContain('No tienes acceso a esta idea');
    expect(fixture.nativeElement.querySelector('.lista')).toBeNull();
  });
});
