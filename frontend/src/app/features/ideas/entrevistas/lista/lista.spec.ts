import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Contacto } from '../../../../core/api/contacto.model';
import { Entrevista } from '../../../../core/api/entrevista.model';
import { Guion } from '../../../../core/api/guion.model';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { NOMBRE_NO_DISPONIBLE } from '../catalogos';
import { ListaEntrevistas } from './lista';

const BASE = '/ideas/i1/entrevistas';

function entrevista(parcial: Partial<Entrevista> = {}): Entrevista {
  return {
    id: 'e1',
    ideaId: 'i1',
    contactoId: 'c1',
    guionId: 'g1',
    respuestas: [{ preguntaId: 'p1', texto: 'Lo resuelvo a mano' }],
    citas: [],
    estadoScoring: 'puntuada',
    score: null,
    ajuste: null,
    fechaCreacion: '2026-03-12T10:00:00.000Z',
    fechaActualizacion: '2026-03-12T10:00:00.000Z',
    ...parcial,
  };
}

function contacto(parcial: Partial<Contacto> = {}): Contacto {
  return {
    id: 'c1',
    ideaId: 'i1',
    nombre: 'Ana Ruiz',
    canal: 'linkedin',
    origen: 'busqueda_directa',
    referidoPorId: null,
    estado: 'entrevistado',
    primerToqueEn: null,
    segundoToqueEn: null,
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    ...parcial,
  };
}

function guion(parcial: Partial<Guion> = {}): Guion {
  return {
    id: 'g1',
    ownerId: 'u1',
    nombre: 'Descubrimiento de dolor',
    preguntas: [{ id: 'p1', orden: 1, texto: '¿Cómo lo resuelves hoy?' }],
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    ...parcial,
  };
}

function pagina<T>(datos: T[], totalPaginas = 1) {
  return { datos, paginacion: { pagina: 1, porPagina: 20, total: datos.length, totalPaginas } };
}

function setup(): { fixture: ComponentFixture<ListaEntrevistas>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'i1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(ListaEntrevistas);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<ListaEntrevistas>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

/** Resuelve los dos catálogos que la vista carga para poder mostrar nombres. */
function responderCatalogos(
  ctrl: HttpTestingController,
  contactos: Contacto[] = [contacto()],
  guiones: Guion[] = [guion()],
): void {
  ctrl
    .expectOne((r) => r.url.endsWith('/contactos') && r.method === 'GET')
    .flush(pagina(contactos));
  ctrl.expectOne((r) => r.url.endsWith('/guiones') && r.method === 'GET').flush(pagina(guiones));
}

function api(fixture: ComponentFixture<ListaEntrevistas>) {
  return fixture.componentInstance as unknown as {
    cambiarFiltroContacto(v: string): void;
    cambiarFiltroEstado(v: string): void;
    paginaSiguiente(): void;
  };
}

describe('ListaEntrevistas', () => {
  it('lista las entrevistas resolviendo contacto y guión a nombres', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush(pagina([entrevista()]));
    responderCatalogos(ctrl);
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ana Ruiz');
    expect(texto).toContain('Descubrimiento de dolor');
    expect(texto).toContain('Puntuada');
    // Nunca se pintan identificadores.
    expect(texto).not.toContain('c1');
    expect(texto).not.toContain('g1');
  });

  it('degrada a un texto neutro cuando un identificador no resuelve', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET')
      .flush(pagina([entrevista({ contactoId: 'c-desconocido' })]));
    responderCatalogos(ctrl);
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain(NOMBRE_NO_DISPONIBLE);
    expect(texto).not.toContain('c-desconocido');
  });

  it('filtrar por contacto envía el parámetro y vuelve a la primera página', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([entrevista()], 3));
    responderCatalogos(ctrl);
    await asentar(fixture);

    api(fixture).cambiarFiltroContacto('c9');
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(BASE));
    expect(req.request.params.get('contactoId')).toBe('c9');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(pagina([]));
    await asentar(fixture);
  });

  it('filtrar por estado de scoring envía el parámetro', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([entrevista()]));
    responderCatalogos(ctrl);
    await asentar(fixture);

    api(fixture).cambiarFiltroEstado('fallida');
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(BASE));
    expect(req.request.params.get('estadoScoring')).toBe('fallida');
    req.flush(pagina([]));
    await asentar(fixture);
  });

  it('ambos filtros viajan juntos en la misma petición', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([entrevista()]));
    responderCatalogos(ctrl);
    await asentar(fixture);

    api(fixture).cambiarFiltroContacto('c9');
    await asentar(fixture);
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([]));
    await asentar(fixture);

    api(fixture).cambiarFiltroEstado('puntuada');
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(BASE));
    expect(req.request.params.get('contactoId')).toBe('c9');
    expect(req.request.params.get('estadoScoring')).toBe('puntuada');
    req.flush(pagina([]));
    await asentar(fixture);
  });

  it('el filtro de contacto ofrece también a los ya entrevistados', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([entrevista()]));
    responderCatalogos(ctrl, [
      contacto({ id: 'c1', nombre: 'Ana Ruiz', estado: 'entrevistado' }),
      contacto({ id: 'c2', nombre: 'Luis Paz', estado: 'agendado' }),
    ]);
    await asentar(fixture);

    const opciones = Array.from(
      fixture.nativeElement.querySelectorAll('#filtro-contacto option'),
    ).map((o) => (o as HTMLOptionElement).textContent?.trim());
    // Filtrar mira al pasado: quien ya fue entrevistado es por quien más interesa filtrar.
    expect(opciones).toContain('Ana Ruiz');
    expect(opciones).toContain('Luis Paz');
  });

  it('avanzar de página vuelve a pedir el listado', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([entrevista()], 3));
    responderCatalogos(ctrl);
    await asentar(fixture);

    api(fixture).paginaSiguiente();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(BASE));
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush(pagina([entrevista({ id: 'e2' })], 3));
    await asentar(fixture);
  });

  it('sin entrevistas muestra el estado vacío', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(pagina([]));
    responderCatalogos(ctrl);
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Todavía no has registrado entrevistas');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('un error muestra el aviso con su código y permite reintentar', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush({ codigo: 'ERROR_INTERNO', mensaje: 'boom' }, { status: 500, statusText: 'Error' });
    responderCatalogos(ctrl);
    await asentar(fixture);

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'ERROR_INTERNO',
    );
  });

  it('no ofrece acciones sobre el scoring: son del change siguiente', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(pagina([entrevista({ estadoScoring: 'procesando' })]));
    responderCatalogos(ctrl);
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Puntuando…');
    expect(texto).not.toContain('Volver a puntuar');
    expect(texto).not.toContain('Ajustar');
  });
});
