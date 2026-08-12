import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Hipotesis } from '../../../core/api/hipotesis.model';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { HipotesisIdea } from './hipotesis';

const BASE = '/ideas/i1/hipotesis';

const hipotesis: Hipotesis = {
  id: 'h1',
  ideaId: 'i1',
  tipo: 'problema',
  enunciado: 'Los fundadores construyen antes de validar',
  estado: 'pendiente',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaActualizacion: '2026-01-01T00:00:00.000Z',
};

function setup(): { fixture: ComponentFixture<HipotesisIdea>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'i1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(HipotesisIdea);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

/**
 * Deja correr los microtasks pendientes (`submit` / `firstValueFrom`) y refresca la
 * vista para que el efecto del `httpResource` emita la petición que toque. No usa
 * `whenStable()` a propósito: en zoneless espera a que NO haya peticiones en vuelo,
 * y aquí justamente estamos provocando la siguiente.
 */
async function asentar(fixture: ComponentFixture<HipotesisIdea>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function botonPorTexto(fixture: ComponentFixture<HipotesisIdea>, texto: string): HTMLButtonElement {
  const botones = Array.from(
    fixture.nativeElement.querySelectorAll('button'),
  ) as HTMLButtonElement[];
  const encontrado = botones.find((b) => (b.textContent ?? '').includes(texto));
  if (!encontrado) {
    throw new Error(`No se encontró el botón "${texto}"`);
  }
  return encontrado;
}

/** Acceso a los métodos protegidos del componente desde el spec. */
function api(fixture: ComponentFixture<HipotesisIdea>) {
  return fixture.componentInstance as unknown as {
    modeloAlta: { set(v: { tipo: string; enunciado: string }): void };
    modeloEdicion: { set(v: { tipo: string; enunciado: string }): void };
    crear(): void;
    iniciarEdicion(h: Hipotesis): void;
    guardarEdicion(): void;
    marcar(h: Hipotesis, estado: string): void;
    pedirEliminar(id: string): void;
    cancelarEliminar(): void;
    confirmarEliminar(id: string): Promise<void>;
  };
}

describe('HipotesisIdea', () => {
  it('lista las hipótesis con su tipo, enunciado y estado, sin paginación', async () => {
    const { fixture, ctrl } = setup();
    const req = ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET');
    expect(req.request.params.has('pagina')).toBe(false);
    req.flush([hipotesis]);
    await fixture.whenStable();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Problema');
    expect(texto).toContain('Los fundadores construyen antes de validar');
    expect(texto).toContain('Pendiente');
    expect(fixture.nativeElement.querySelector('.paginacion')).toBeNull();
  });

  it('sin hipótesis muestra un estado vacío, no un error', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Todavía no has declarado');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('una idea ajena (403) muestra acceso denegado sin revelar contenido', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(
        { codigo: 'ACCESO_DENEGADO', mensaje: 'denegado' },
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No tienes acceso');
    expect(fixture.nativeElement.textContent).not.toContain('Los fundadores construyen');
  });

  it('un fallo de red ofrece reintentar sin romper la vista', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).error(new ProgressEvent('error'));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Reintentar');

    botonPorTexto(fixture, 'Reintentar').click();
    await asentar(fixture);

    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush([hipotesis]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Los fundadores construyen');
  });

  it('el alta hace POST y refresca la lista', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([]);
    await fixture.whenStable();

    api(fixture).modeloAlta.set({ tipo: 'pago', enunciado: 'Pagarían 30 USD al mes' });
    api(fixture).crear();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'POST');
    expect(req.request.body).toEqual({ tipo: 'pago', enunciado: 'Pagarían 30 USD al mes' });
    req.flush({ ...hipotesis, id: 'h2', tipo: 'pago', enunciado: 'Pagarían 30 USD al mes' });
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET')
      .flush([{ ...hipotesis, id: 'h2', tipo: 'pago', enunciado: 'Pagarían 30 USD al mes' }]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Pagarían 30 USD al mes');
    expect(fixture.nativeElement.textContent).toContain('Pendiente');
  });

  it('con el enunciado vacío el envío queda bloqueado y no se emite la petición', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([]);
    await fixture.whenStable();

    expect(botonPorTexto(fixture, 'Añadir hipótesis').disabled).toBe(true);

    api(fixture).crear();
    await asentar(fixture);

    ctrl.expectNone((r) => r.method === 'POST');
  });

  it('el formulario de alta no ofrece elegir el estado inicial', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([]);
    await fixture.whenStable();

    const opciones = Array.from(fixture.nativeElement.querySelectorAll('.alta option')).map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(opciones).toEqual(['problema', 'mercado', 'pago']);
    expect(opciones).not.toContain('pendiente');
  });

  it('un 422 al crear se muestra campo a campo', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([]);
    await fixture.whenStable();

    api(fixture).modeloAlta.set({ tipo: 'problema', enunciado: 'x' });
    api(fixture).crear();
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.method === 'POST')
      .flush(
        {
          codigo: 'VALIDACION_FALLIDA',
          mensaje: 'inválido',
          detalles: [{ campo: 'enunciado', problema: 'Debe ser una afirmación falsable' }],
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('Debe ser una afirmación falsable');
  });

  it('la edición inline hace PATCH con tipo y enunciado y refleja el cambio', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([hipotesis]);
    await fixture.whenStable();

    api(fixture).iniciarEdicion(hipotesis);
    await asentar(fixture);
    api(fixture).modeloEdicion.set({ tipo: 'mercado', enunciado: 'Enunciado corregido' });
    api(fixture).guardarEdicion();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(`${BASE}/h1`) && r.method === 'PATCH');
    expect(req.request.body).toEqual({ tipo: 'mercado', enunciado: 'Enunciado corregido' });
    expect(JSON.stringify(req.request.body)).not.toContain('ideaId');
    req.flush({ ...hipotesis, tipo: 'mercado', enunciado: 'Enunciado corregido' });
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET')
      .flush([{ ...hipotesis, tipo: 'mercado', enunciado: 'Enunciado corregido' }]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Enunciado corregido');
    expect(fixture.nativeElement.textContent).toContain('Mercado');
  });

  it('un 404 al editar avisa de que la hipótesis ya no existe y refresca la lista', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([hipotesis]);
    await fixture.whenStable();

    api(fixture).iniciarEdicion(hipotesis);
    await asentar(fixture);
    api(fixture).modeloEdicion.set({ tipo: 'problema', enunciado: 'Otro enunciado' });
    api(fixture).guardarEdicion();
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.method === 'PATCH')
      .flush(
        { codigo: 'RECURSO_NO_ENCONTRADO', mensaje: 'no existe' },
        { status: 404, statusText: 'Not Found' },
      );
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('ya no existe');

    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Todavía no has declarado');
  });

  it('marcar una hipótesis envía un PATCH con solo el estado', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([hipotesis]);
    await fixture.whenStable();

    api(fixture).marcar(hipotesis, 'confirmada');
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(`${BASE}/h1`) && r.method === 'PATCH');
    expect(req.request.body).toEqual({ estado: 'confirmada' });
    req.flush({ ...hipotesis, estado: 'confirmada' });
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET')
      .flush([{ ...hipotesis, estado: 'confirmada' }]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Confirmada');
  });

  it('una hipótesis refutada puede devolverse a pendiente', async () => {
    const { fixture, ctrl } = setup();
    const refutada: Hipotesis = { ...hipotesis, estado: 'refutada' };
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([refutada]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Volver a pendiente');

    botonPorTexto(fixture, 'Volver a pendiente').click();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(`${BASE}/h1`) && r.method === 'PATCH');
    expect(req.request.body).toEqual({ estado: 'pendiente' });
    req.flush(hipotesis);
    await asentar(fixture);

    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush([hipotesis]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Pendiente');
  });

  it('eliminar exige confirmación: cancelar no emite ninguna petición', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([hipotesis]);
    await fixture.whenStable();

    api(fixture).pedirEliminar('h1');
    await asentar(fixture);
    expect(fixture.nativeElement.textContent).toContain('¿Eliminar esta hipótesis?');

    api(fixture).cancelarEliminar();
    await asentar(fixture);

    ctrl.expectNone((r) => r.method === 'DELETE');
    expect(fixture.nativeElement.textContent).toContain('Los fundadores construyen');
  });

  it('eliminar confirmado hace DELETE y la hipótesis desaparece de la lista', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([hipotesis]);
    await fixture.whenStable();

    api(fixture).pedirEliminar('h1');
    await asentar(fixture);
    void api(fixture).confirmarEliminar('h1');
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.url.endsWith(`${BASE}/h1`) && r.method === 'DELETE')
      .flush(null, { status: 204, statusText: 'No Content' });
    await asentar(fixture);

    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush([]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Los fundadores construyen');
    expect(fixture.nativeElement.textContent).toContain('Todavía no has declarado');
  });
});
