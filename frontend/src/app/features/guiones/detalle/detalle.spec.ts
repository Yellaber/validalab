import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Guion } from '../../../core/api/guion.model';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { DetalleGuion } from './detalle';

const BASE = '/guiones';

function guion(parcial: Partial<Guion> = {}): Guion {
  return {
    id: 'g1',
    ownerId: 'u1',
    nombre: 'Descubrimiento de dolor',
    descripcion: 'Guión base para entrevistas en frío',
    preguntas: [
      { id: 'p1', orden: 1, texto: 'Primera' },
      { id: 'p2', orden: 2, texto: 'Segunda' },
    ],
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    ...parcial,
  };
}

function setup(): { fixture: ComponentFixture<DetalleGuion>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'g1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(DetalleGuion);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<DetalleGuion>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function botonPorTexto(
  fixture: ComponentFixture<DetalleGuion>,
  texto: string,
): HTMLButtonElement | undefined {
  return (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
    (b) => (b.textContent ?? '').includes(texto),
  );
}

describe('DetalleGuion', () => {
  it('muestra el guión con sus preguntas por orden ascendente', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(`${BASE}/g1`) && r.method === 'GET')
      .flush(
        guion({
          preguntas: [
            { id: 'p2', orden: 2, texto: 'Segunda' },
            { id: 'p1', orden: 1, texto: 'Primera' },
            { id: 'p3', orden: 3, texto: 'Tercera' },
          ],
        }),
      );
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('Descubrimiento de dolor');
    expect(fixture.nativeElement.textContent).toContain('Guión base para entrevistas en frío');

    const items = Array.from(fixture.nativeElement.querySelectorAll('.preguntas-detalle li')).map(
      (li) => (li as HTMLElement).textContent?.trim(),
    );
    expect(items).toEqual(['Primera', 'Segunda', 'Tercera']);
  });

  it('el borrado confirmado hace DELETE y vuelve al listado', async () => {
    const { fixture, ctrl } = setup();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
    ctrl.expectOne((r) => r.method === 'GET').flush(guion());
    await asentar(fixture);

    botonPorTexto(fixture, 'Eliminar')!.click();
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('¿Eliminar «Descubrimiento de dolor»?');

    botonPorTexto(fixture, 'Sí, eliminar')!.click();
    await asentar(fixture);

    ctrl.expectOne((r) => r.url.endsWith(`${BASE}/g1`) && r.method === 'DELETE').flush(null);
    await asentar(fixture);

    expect(navegar).toHaveBeenCalledWith(['/guiones']);
  });

  it('el borrado cancelado no emite ninguna petición', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.method === 'GET').flush(guion());
    await asentar(fixture);

    botonPorTexto(fixture, 'Eliminar')!.click();
    await asentar(fixture);
    botonPorTexto(fixture, 'Cancelar')!.click();
    await asentar(fixture);

    ctrl.expectNone((r) => r.method === 'DELETE');
    expect(fixture.nativeElement.textContent).toContain('Descubrimiento de dolor');
  });

  it('no usa window.confirm para confirmar el borrado', async () => {
    const espia = vi.spyOn(window, 'confirm');
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.method === 'GET').flush(guion());
    await asentar(fixture);

    botonPorTexto(fixture, 'Eliminar')!.click();
    await asentar(fixture);

    expect(espia).not.toHaveBeenCalled();
    espia.mockRestore();
  });

  it('un 404 indica que el guión no existe y ofrece volver', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.method === 'GET')
      .flush(
        { codigo: 'RECURSO_NO_ENCONTRADO', mensaje: 'no existe' },
        { status: 404, statusText: 'Not Found' },
      );
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('Este guión no existe');
    expect(fixture.nativeElement.textContent).toContain('Volver a los guiones');
  });

  it('un 403 no revela ningún dato del guión', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.method === 'GET')
      .flush(
        { codigo: 'ACCESO_DENEGADO', mensaje: 'ajeno' },
        { status: 403, statusText: 'Forbidden' },
      );
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('No tienes acceso a este guión');
    expect(texto).not.toContain('Descubrimiento de dolor');
    expect(texto).not.toContain('pregunta');
    expect(fixture.nativeElement.querySelector('.preguntas-detalle')).toBeNull();
    // Tampoco se ofrecen acciones sobre un recurso que no es suyo.
    expect(botonPorTexto(fixture, 'Eliminar')).toBeUndefined();
  });
});
