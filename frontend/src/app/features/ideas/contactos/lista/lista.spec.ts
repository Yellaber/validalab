import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Contacto } from '../../../../core/api/contacto.model';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { ListaContactos } from './lista';

const BASE = '/ideas/i1/contactos';

function contacto(parcial: Partial<Contacto> = {}): Contacto {
  return {
    id: 'c1',
    ideaId: 'i1',
    nombre: 'Ana Ruiz',
    perfil: 'CTO en fintech',
    canal: 'linkedin',
    origen: 'busqueda_directa',
    referidoPorId: null,
    estado: 'por_contactar',
    primerToqueEn: null,
    segundoToqueEn: null,
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    ...parcial,
  };
}

function pagina(datos: Contacto[], totalPaginas = 1) {
  return { datos, paginacion: { pagina: 1, porPagina: 20, total: datos.length, totalPaginas } };
}

function setup(): { fixture: ComponentFixture<ListaContactos>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'i1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(ListaContactos);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<ListaContactos>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function api(fixture: ComponentFixture<ListaContactos>) {
  return fixture.componentInstance as unknown as {
    cambiarFiltro(v: string): void;
    paginaSiguiente(): void;
  };
}

describe('ListaContactos', () => {
  it('lista los contactos con su estado del embudo y su número de toques', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET')
      .flush(
        pagina([
          contacto({ primerToqueEn: '2026-03-12T10:00:00.000Z' }),
          contacto({ id: 'c2', nombre: 'Luis Paz', estado: 'respondio', perfil: undefined }),
        ]),
      );
    await fixture.whenStable();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Ana Ruiz');
    expect(texto).toContain('CTO en fintech');
    expect(texto).toContain('LinkedIn');
    expect(texto).toContain('Por contactar');
    expect(texto).toContain('1 toque');
    expect(texto).toContain('Luis Paz');
    expect(texto).toContain('Respondió');
    expect(texto).toContain('Sin toques');
  });

  it('marca el límite cuando el contacto tiene dos toques', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(
        pagina([
          contacto({
            primerToqueEn: '2026-03-12T10:00:00.000Z',
            segundoToqueEn: '2026-03-19T10:00:00.000Z',
          }),
        ]),
      );
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('2 toques (límite)');
  });

  it('el filtro ofrece los seis estados, entrevistado incluido', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([contacto()]));
    await fixture.whenStable();

    const opciones = Array.from(
      fixture.nativeElement.querySelectorAll('#filtro-estado option'),
    ).map((o) => (o as HTMLOptionElement).value);

    // 6 estados + la opción "Todos".
    expect(opciones).toHaveLength(7);
    expect(opciones).toContain('entrevistado');
  });

  it('filtrar reemite la consulta con el parámetro estado', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([contacto()]));
    await fixture.whenStable();

    api(fixture).cambiarFiltro('respondio');
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET');
    expect(req.request.params.get('estado')).toBe('respondio');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(pagina([contacto({ estado: 'respondio' })]));
    await fixture.whenStable();
  });

  it('avanzar de página reemite la consulta con la nueva pagina', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([contacto()], 3));
    await fixture.whenStable();

    api(fixture).paginaSiguiente();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET');
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush(pagina([contacto({ id: 'c9', nombre: 'Eva Sol' })], 3));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Eva Sol');
  });

  it('sin contactos muestra un estado vacío, no un error', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([], 0));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Todavía no has registrado contactos');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('un fallo de red ofrece reintentar', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).error(new ProgressEvent('error'));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('un 403 no revela ningún dato de contacto', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(
        { codigo: 'ACCESO_DENEGADO', mensaje: 'denegado' },
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('No tienes acceso');
    expect(texto).not.toContain('Ana Ruiz');
    expect(texto).not.toContain('CTO');
    expect(texto).not.toContain('toque');
  });
});
