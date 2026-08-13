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

  it('con sesión, los contactos de una idea cuelgan del shell con carga diferida', async () => {
    setup(true);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/ideas/i1/contactos');
    harness.detectChanges();

    const ctrl = TestBed.inject(HttpTestingController);
    ctrl
      .expectOne((r) => r.url.endsWith('/ideas/i1/contactos'))
      .flush({ datos: [], paginacion: { pagina: 1, porPagina: 20, total: 0, totalPaginas: 0 } });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/ideas/i1/contactos');
    expect(harness.fixture.nativeElement.textContent).toContain('Contactos');
  });

  it('con sesión, el detalle de un contacto cuelga del shell', async () => {
    setup(true);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/ideas/i1/contactos/c1');
    harness.detectChanges();

    const ctrl = TestBed.inject(HttpTestingController);
    ctrl
      .expectOne((r) => r.url.endsWith('/ideas/i1/contactos/c1'))
      .flush({
        id: 'c1',
        ideaId: 'i1',
        nombre: 'Ana Ruiz',
        canal: 'linkedin',
        origen: 'busqueda_directa',
        estado: 'por_contactar',
        fechaCreacion: '2026-01-01T00:00:00.000Z',
        fechaActualizacion: '2026-01-01T00:00:00.000Z',
      });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/ideas/i1/contactos/c1');
    expect(harness.fixture.nativeElement.textContent).toContain('Ana Ruiz');
  });

  it('sin sesión, las rutas anidadas de una idea redirigen a /login', async () => {
    setup(false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/ideas/i1/umbrales');

    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
