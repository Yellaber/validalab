import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector, provideZonelessChangeDetection, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Contacto } from '../../../core/api/contacto.model';
import { Guion } from '../../../core/api/guion.model';
import { CatalogosIdea, NOMBRE_NO_DISPONIBLE, catalogosDeIdea } from './catalogos';

function contacto(parcial: Partial<Contacto> = {}): Contacto {
  return {
    id: 'c1',
    ideaId: 'i1',
    nombre: 'Ana Ruiz',
    canal: 'linkedin',
    origen: 'busqueda_directa',
    referidoPorId: null,
    estado: 'agendado',
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

function pagina<T>(datos: T[]) {
  return { datos, paginacion: { pagina: 1, porPagina: 200, total: datos.length, totalPaginas: 1 } };
}

function setup(): { catalogos: CatalogosIdea; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  const injector = TestBed.inject(Injector);
  const catalogos = runInInjectionContext(injector, () => catalogosDeIdea('i1'));
  return { catalogos, ctrl: TestBed.inject(HttpTestingController) };
}

async function asentar(): Promise<void> {
  await new Promise((r) => setTimeout(r));
  TestBed.tick();
}

function responder(ctrl: HttpTestingController, contactos: Contacto[], guiones: Guion[]): void {
  ctrl.expectOne((r) => r.url.includes('/contactos')).flush(pagina(contactos));
  ctrl.expectOne((r) => r.url.endsWith('/guiones')).flush(pagina(guiones));
}

describe('catalogosDeIdea', () => {
  it('resuelve identificadores a nombres', async () => {
    const { catalogos, ctrl } = setup();
    await asentar();
    responder(ctrl, [contacto()], [guion()]);
    await asentar();

    expect(catalogos.nombreContacto()('c1')).toBe('Ana Ruiz');
    expect(catalogos.nombreGuion()('g1')).toBe('Descubrimiento de dolor');
  });

  it('degrada a un texto neutro sin filtrar el identificador', async () => {
    const { catalogos, ctrl } = setup();
    await asentar();
    responder(ctrl, [contacto()], [guion()]);
    await asentar();

    const resultado = catalogos.nombreContacto()('c-desconocido');
    expect(resultado).toBe(NOMBRE_NO_DISPONIBLE);
    expect(resultado).not.toContain('c-desconocido');
  });

  it('excluye de los entrevistables los estados entrevistado y descartado', async () => {
    const { catalogos, ctrl } = setup();
    await asentar();
    responder(
      ctrl,
      [
        contacto({ id: 'c1', nombre: 'Ana Ruiz', estado: 'agendado' }),
        contacto({ id: 'c2', nombre: 'Luis Paz', estado: 'entrevistado' }),
        contacto({ id: 'c3', nombre: 'Eva Sol', estado: 'descartado' }),
        contacto({ id: 'c4', nombre: 'Iván Gil', estado: 'respondio' }),
      ],
      [guion()],
    );
    await asentar();

    expect(catalogos.entrevistables().map((c) => c.nombre)).toEqual(['Ana Ruiz', 'Iván Gil']);
  });

  it('un contacto que vuelve a agendado tras borrar su entrevista es entrevistable', async () => {
    const { catalogos, ctrl } = setup();
    await asentar();
    // El contrato devuelve el contacto a `agendado` al eliminar su entrevista.
    responder(ctrl, [contacto({ id: 'c2', nombre: 'Luis Paz', estado: 'agendado' })], [guion()]);
    await asentar();

    expect(catalogos.entrevistables().map((c) => c.nombre)).toEqual(['Luis Paz']);
  });

  it('pide los catálogos de la idea con una página generosa', async () => {
    const { ctrl } = setup();
    await asentar();

    const req = ctrl.expectOne((r) => r.url.includes('/contactos'));
    expect(Number(req.request.params.get('porPagina'))).toBeGreaterThanOrEqual(100);
    req.flush(pagina([contacto()]));
    ctrl.expectOne((r) => r.url.endsWith('/guiones')).flush(pagina([guion()]));
    await asentar();
  });
});
