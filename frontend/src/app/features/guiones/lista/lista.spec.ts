import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Guion } from '../../../core/api/guion.model';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { ListaGuiones } from './lista';

const BASE = '/guiones';

function guion(parcial: Partial<Guion> = {}): Guion {
  return {
    id: 'g1',
    ownerId: 'u1',
    nombre: 'Descubrimiento de dolor',
    descripcion: 'Guión base para entrevistas en frío',
    preguntas: [
      { id: 'p1', orden: 1, texto: '¿Cómo resuelves esto hoy?' },
      { id: 'p2', orden: 2, texto: '¿Cuánto te cuesta?' },
    ],
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    ...parcial,
  };
}

function pagina(datos: Guion[], totalPaginas = 1) {
  return { datos, paginacion: { pagina: 1, porPagina: 20, total: datos.length, totalPaginas } };
}

function setup(): { fixture: ComponentFixture<ListaGuiones>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const fixture = TestBed.createComponent(ListaGuiones);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<ListaGuiones>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function api(fixture: ComponentFixture<ListaGuiones>) {
  return fixture.componentInstance as unknown as { paginaSiguiente(): void };
}

describe('ListaGuiones', () => {
  it('lista los guiones con su descripción y su número de preguntas', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET')
      .flush(
        pagina([
          guion(),
          guion({
            id: 'g2',
            nombre: 'Validación de pago',
            descripcion: undefined,
            preguntas: [{ id: 'p9', orden: 1, texto: '¿Pagarías por esto?' }],
          }),
        ]),
      );
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Descubrimiento de dolor');
    expect(texto).toContain('Guión base para entrevistas en frío');
    expect(texto).toContain('2 preguntas');
    expect(texto).toContain('Validación de pago');
    // El singular importa: una sola pregunta no es «1 preguntas».
    expect(texto).toContain('1 pregunta');
  });

  it('pide la colección de primer nivel, sin colgar de ninguna idea', async () => {
    const { fixture, ctrl } = setup();

    const req = ctrl.expectOne((r) => r.method === 'GET');
    expect(req.request.url).not.toContain('/ideas');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(pagina([guion()]));
    await asentar(fixture);
  });

  it('no ofrece filtro ni búsqueda: el contrato no los expone aquí', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.method === 'GET').flush(pagina([guion()]));
    await asentar(fixture);

    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeNull();
  });

  it('avanzar de página vuelve a pedir el listado con la página nueva', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.method === 'GET').flush(pagina([guion()], 3));
    await asentar(fixture);

    api(fixture).paginaSiguiente();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.method === 'GET');
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush(pagina([guion({ id: 'g3', nombre: 'Otro guión' })], 3));
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('Otro guión');
  });

  it('sin guiones muestra el estado vacío que invita a crear el primero', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.method === 'GET').flush(pagina([]));
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Todavía no has creado ningún guión');
    expect(texto).toContain('Crea el primero');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('un error muestra el aviso con su código y permite reintentar', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.method === 'GET')
      .flush(
        { codigo: 'ERROR_INTERNO', mensaje: 'boom' },
        { status: 500, statusText: 'Server Error' },
      );
    await asentar(fixture);

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'ERROR_INTERNO',
    );

    const boton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      ((b as HTMLButtonElement).textContent ?? '').includes('Reintentar'),
    ) as HTMLButtonElement;
    boton.click();
    await asentar(fixture);

    ctrl.expectOne((r) => r.method === 'GET').flush(pagina([guion()]));
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('Descubrimiento de dolor');
  });
});
