import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SesionService } from './core/auth/sesion.service';
import { routes } from './app.routes';

function setup(autenticado: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: SesionService,
        useValue: { estaAutenticado: () => autenticado, usuario: () => null },
      },
    ],
  });
}

describe('rutas del portafolio', () => {
  it('con sesión, la ruta por defecto del shell renderiza el listado de ideas', async () => {
    setup(true);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    harness.detectChanges();

    // El listado del shell dispara la carga; la resolvemos para estabilizar.
    const ctrl = TestBed.inject(HttpTestingController);
    ctrl
      .expectOne((r) => r.url.endsWith('/ideas'))
      .flush({ datos: [], paginacion: { pagina: 1, porPagina: 20, total: 0, totalPaginas: 0 } });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/ideas');
    expect(harness.fixture.nativeElement.textContent).toContain('Portafolio de ideas');
  });

  it('sin sesión, una ruta de ideas redirige a /login', async () => {
    setup(false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/ideas');

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('con sesión, las hipótesis de una idea cuelgan del shell con carga diferida', async () => {
    setup(true);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/ideas/i1/hipotesis');
    harness.detectChanges();

    const ctrl = TestBed.inject(HttpTestingController);
    ctrl.expectOne((r) => r.url.endsWith('/ideas/i1/hipotesis')).flush([]);
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/ideas/i1/hipotesis');
    expect(harness.fixture.nativeElement.textContent).toContain('Hipótesis');
  });

  it('con sesión, los umbrales de una idea cuelgan del shell con carga diferida', async () => {
    setup(true);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/ideas/i1/umbrales');
    harness.detectChanges();

    const ctrl = TestBed.inject(HttpTestingController);
    ctrl.expectOne((r) => r.url.endsWith('/ideas/i1/umbrales')).flush([]);
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/ideas/i1/umbrales');
    expect(harness.fixture.nativeElement.textContent).toContain('Umbrales kill/go');
  });

  it('sin sesión, las rutas anidadas de una idea redirigen a /login', async () => {
    setup(false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/ideas/i1/umbrales');

    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
