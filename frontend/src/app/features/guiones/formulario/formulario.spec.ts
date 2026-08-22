import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Guion } from '../../../core/api/guion.model';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { FilaPregunta } from '../preguntas';
import { FormularioGuion } from './formulario';

const BASE = '/guiones';

function guion(parcial: Partial<Guion> = {}): Guion {
  return {
    id: 'g1',
    ownerId: 'u1',
    nombre: 'Descubrimiento de dolor',
    preguntas: [
      { id: 'p1', orden: 1, texto: 'Primera' },
      { id: 'p2', orden: 2, texto: 'Segunda' },
      { id: 'p3', orden: 3, texto: 'Tercera' },
    ],
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    ...parcial,
  };
}

/** `idGuion` presente → modo edición; ausente → alta. */
function setup(idGuion: string | null = null): {
  fixture: ComponentFixture<FormularioGuion>;
  ctrl: HttpTestingController;
} {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => idGuion } } },
      },
    ],
  });
  const fixture = TestBed.createComponent(FormularioGuion);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<FormularioGuion>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

interface ApiFormulario {
  modelo: {
    (): { nombre: string; descripcion: string; preguntas: FilaPregunta[] };
    set(v: { nombre: string; descripcion: string; preguntas: FilaPregunta[] }): void;
    update(
      f: (m: { nombre: string; descripcion: string; preguntas: FilaPregunta[] }) => {
        nombre: string;
        descripcion: string;
        preguntas: FilaPregunta[];
      },
    ): void;
  };
  anadirPregunta(): void;
  quitarPregunta(i: number): void;
  moverPregunta(i: number, d: -1 | 1): void;
  onSubmit(): void;
}

function api(fixture: ComponentFixture<FormularioGuion>): ApiFormulario {
  return fixture.componentInstance as unknown as ApiFormulario;
}

/** Rellena el modelo conservando las claves locales que ya existan. */
function rellenar(
  fixture: ComponentFixture<FormularioGuion>,
  nombre: string,
  textos: string[],
  descripcion = '',
): void {
  api(fixture).modelo.update((m) => ({
    nombre,
    descripcion,
    preguntas: textos.map((texto, i) => ({
      claveLocal: m.preguntas[i]?.claveLocal ?? `extra-${i}`,
      texto,
    })),
  }));
}

function inputsDePregunta(fixture: ComponentFixture<FormularioGuion>): HTMLInputElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.fila-pregunta input'),
  ) as HTMLInputElement[];
}

function botonPorEtiqueta(
  fixture: ComponentFixture<FormularioGuion>,
  etiqueta: string,
): HTMLButtonElement | undefined {
  return (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
    (b) => b.getAttribute('aria-label') === etiqueta,
  );
}

function botonPorTexto(
  fixture: ComponentFixture<FormularioGuion>,
  texto: string,
): HTMLButtonElement | undefined {
  return (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
    (b) => (b.textContent ?? '').includes(texto),
  );
}

describe('FormularioGuion', () => {
  describe('editor de preguntas', () => {
    it('el alta arranca ya con una pregunta vacía', async () => {
      const { fixture } = setup();
      await fixture.whenStable();

      expect(inputsDePregunta(fixture)).toHaveLength(1);
      expect(inputsDePregunta(fixture)[0].value).toBe('');
    });

    it('añadir agrega una fila vacía al final', async () => {
      const { fixture } = setup();
      await fixture.whenStable();

      botonPorTexto(fixture, 'Añadir pregunta')!.click();
      await asentar(fixture);

      expect(inputsDePregunta(fixture)).toHaveLength(2);
    });

    it('mover arriba intercambia la fila con la anterior', async () => {
      const { fixture } = setup();
      await fixture.whenStable();
      api(fixture).anadirPregunta();
      rellenar(fixture, 'Guion', ['A', 'B']);
      await asentar(fixture);

      botonPorEtiqueta(fixture, 'Subir la pregunta 2')!.click();
      await asentar(fixture);

      expect(inputsDePregunta(fixture).map((i) => i.value)).toEqual(['B', 'A']);
    });

    it('mover abajo intercambia la fila con la siguiente', async () => {
      const { fixture } = setup();
      await fixture.whenStable();
      api(fixture).anadirPregunta();
      rellenar(fixture, 'Guion', ['A', 'B']);
      await asentar(fixture);

      botonPorEtiqueta(fixture, 'Bajar la pregunta 1')!.click();
      await asentar(fixture);

      expect(inputsDePregunta(fixture).map((i) => i.value)).toEqual(['B', 'A']);
    });

    it('la primera no puede subir y la última no puede bajar', async () => {
      const { fixture } = setup();
      await fixture.whenStable();
      api(fixture).anadirPregunta();
      await asentar(fixture);

      expect(botonPorEtiqueta(fixture, 'Subir la pregunta 1')!.disabled).toBe(true);
      expect(botonPorEtiqueta(fixture, 'Bajar la pregunta 1')!.disabled).toBe(false);
      expect(botonPorEtiqueta(fixture, 'Subir la pregunta 2')!.disabled).toBe(false);
      expect(botonPorEtiqueta(fixture, 'Bajar la pregunta 2')!.disabled).toBe(true);
    });

    it('con una sola pregunta no se ofrece quitarla y se explica por qué', async () => {
      const { fixture } = setup();
      await fixture.whenStable();

      expect(botonPorEtiqueta(fixture, 'Quitar la pregunta 1')).toBeUndefined();
      expect(fixture.nativeElement.textContent).toContain(
        'Un guión necesita al menos una pregunta',
      );
    });

    it('con dos preguntas se puede quitar una, y entonces desaparece la acción', async () => {
      const { fixture } = setup();
      await fixture.whenStable();
      api(fixture).anadirPregunta();
      await asentar(fixture);

      expect(botonPorEtiqueta(fixture, 'Quitar la pregunta 2')).toBeDefined();
      botonPorEtiqueta(fixture, 'Quitar la pregunta 2')!.click();
      await asentar(fixture);

      expect(inputsDePregunta(fixture)).toHaveLength(1);
      expect(botonPorEtiqueta(fixture, 'Quitar la pregunta 1')).toBeUndefined();
    });

    it('no hay ningún control para escribir el orden', async () => {
      const { fixture } = setup();
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('input[type="number"]')).toBeNull();
    });
  });

  describe('alta', () => {
    it('hace POST con el nombre y las preguntas numeradas por posición', async () => {
      const { fixture, ctrl } = setup();
      await fixture.whenStable();
      api(fixture).anadirPregunta();
      api(fixture).anadirPregunta();
      rellenar(fixture, 'Descubrimiento de dolor', ['Primera', 'Segunda', 'Tercera']);
      await asentar(fixture);

      api(fixture).onSubmit();
      await asentar(fixture);

      const req = ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'POST');
      expect(req.request.body).toEqual({
        nombre: 'Descubrimiento de dolor',
        preguntas: [
          { orden: 1, texto: 'Primera' },
          { orden: 2, texto: 'Segunda' },
          { orden: 3, texto: 'Tercera' },
        ],
      });
      req.flush(guion());
      await asentar(fixture);
    });

    it('tras el 201 navega al detalle del guión creado', async () => {
      const { fixture, ctrl } = setup();
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
      await fixture.whenStable();
      rellenar(fixture, 'Guion', ['Primera']);
      await asentar(fixture);

      api(fixture).onSubmit();
      await asentar(fixture);

      ctrl.expectOne((r) => r.method === 'POST').flush(guion({ id: 'g7' }));
      await asentar(fixture);

      expect(navegar).toHaveBeenCalledWith(['/guiones', 'g7']);
    });

    it('el cuerpo no lleva ownerId ni la clave local del editor', async () => {
      const { fixture, ctrl } = setup();
      await fixture.whenStable();
      rellenar(fixture, 'Guion', ['Primera']);
      await asentar(fixture);

      api(fixture).onSubmit();
      await asentar(fixture);

      const req = ctrl.expectOne((r) => r.method === 'POST');
      const cuerpo = JSON.stringify(req.request.body);
      expect(cuerpo).not.toContain('ownerId');
      expect(cuerpo).not.toContain('claveLocal');
      expect(cuerpo).not.toContain('fila-');
      req.flush(guion());
      await asentar(fixture);
    });

    it('la descripción vacía se omite del cuerpo', async () => {
      const { fixture, ctrl } = setup();
      await fixture.whenStable();
      rellenar(fixture, 'Guion', ['Primera'], '   ');
      await asentar(fixture);

      api(fixture).onSubmit();
      await asentar(fixture);

      const req = ctrl.expectOne((r) => r.method === 'POST');
      expect(req.request.body).not.toHaveProperty('descripcion');
      req.flush(guion());
      await asentar(fixture);
    });

    it('sin nombre el envío queda bloqueado y no se emite la petición', async () => {
      const { fixture, ctrl } = setup();
      await fixture.whenStable();
      rellenar(fixture, '', ['Primera']);
      await asentar(fixture);

      expect(botonPorTexto(fixture, 'Crear guión')!.disabled).toBe(true);

      api(fixture).onSubmit();
      await asentar(fixture);

      ctrl.expectNone((r) => r.method === 'POST');
    });

    it('con una pregunta en blanco el envío queda bloqueado', async () => {
      const { fixture, ctrl } = setup();
      await fixture.whenStable();
      api(fixture).anadirPregunta();
      rellenar(fixture, 'Guion', ['Primera', '   ']);
      await asentar(fixture);

      expect(botonPorTexto(fixture, 'Crear guión')!.disabled).toBe(true);

      api(fixture).onSubmit();
      await asentar(fixture);

      ctrl.expectNone((r) => r.method === 'POST');
    });

    it('un 422 sobre el nombre se muestra en su campo', async () => {
      const { fixture, ctrl } = setup();
      await fixture.whenStable();
      rellenar(fixture, 'Guion', ['Primera']);
      await asentar(fixture);

      api(fixture).onSubmit();
      await asentar(fixture);

      ctrl
        .expectOne((r) => r.method === 'POST')
        .flush(
          {
            codigo: 'VALIDACION_FALLIDA',
            mensaje: 'inválido',
            detalles: [{ campo: 'nombre', problema: 'Nombre demasiado corto' }],
          },
          { status: 422, statusText: 'Unprocessable Entity' },
        );
      await asentar(fixture);

      expect(fixture.nativeElement.textContent).toContain('Nombre demasiado corto');
    });

    it('un 422 sobre una pregunta se muestra junto a su fila', async () => {
      const { fixture, ctrl } = setup();
      await fixture.whenStable();
      api(fixture).anadirPregunta();
      rellenar(fixture, 'Guion', ['Primera', 'Segunda']);
      await asentar(fixture);

      api(fixture).onSubmit();
      await asentar(fixture);

      ctrl
        .expectOne((r) => r.method === 'POST')
        .flush(
          {
            codigo: 'VALIDACION_FALLIDA',
            mensaje: 'inválido',
            detalles: [{ campo: 'preguntas[1].texto', problema: 'Pregunta demasiado larga' }],
          },
          { status: 422, statusText: 'Unprocessable Entity' },
        );
      await asentar(fixture);

      const filas = Array.from(
        fixture.nativeElement.querySelectorAll('.fila-pregunta'),
      ) as HTMLElement[];
      expect(filas[1].textContent).toContain('Pregunta demasiado larga');
      expect(filas[0].textContent).not.toContain('Pregunta demasiado larga');
    });
  });

  describe('edición', () => {
    it('carga el guión y lo vuelca al formulario en orden', async () => {
      const { fixture, ctrl } = setup('g1');
      ctrl
        .expectOne((r) => r.url.endsWith(`${BASE}/g1`) && r.method === 'GET')
        .flush(
          guion({
            descripcion: 'Base para frío',
            preguntas: [
              { id: 'p3', orden: 3, texto: 'Tercera' },
              { id: 'p1', orden: 1, texto: 'Primera' },
              { id: 'p2', orden: 2, texto: 'Segunda' },
            ],
          }),
        );
      await asentar(fixture);

      expect(inputsDePregunta(fixture).map((i) => i.value)).toEqual([
        'Primera',
        'Segunda',
        'Tercera',
      ]);
      expect(fixture.nativeElement.querySelector('textarea').value).toBe('Base para frío');
    });

    it('cambiar una sola pregunta envía el conjunto ordenado completo', async () => {
      const { fixture, ctrl } = setup('g1');
      ctrl.expectOne((r) => r.method === 'GET').flush(guion());
      await asentar(fixture);

      rellenar(fixture, 'Descubrimiento de dolor', ['Primera', 'Segunda corregida', 'Tercera']);
      await asentar(fixture);

      api(fixture).onSubmit();
      await asentar(fixture);

      const req = ctrl.expectOne((r) => r.url.endsWith(`${BASE}/g1`) && r.method === 'PATCH');
      expect(req.request.body.preguntas).toEqual([
        { orden: 1, texto: 'Primera' },
        { orden: 2, texto: 'Segunda corregida' },
        { orden: 3, texto: 'Tercera' },
      ]);
      req.flush(guion());
      await asentar(fixture);
    });

    it('tras el 200 navega al detalle del guión', async () => {
      const { fixture, ctrl } = setup('g1');
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
      ctrl.expectOne((r) => r.method === 'GET').flush(guion());
      await asentar(fixture);

      api(fixture).onSubmit();
      await asentar(fixture);

      ctrl.expectOne((r) => r.method === 'PATCH').flush(guion());
      await asentar(fixture);

      expect(navegar).toHaveBeenCalledWith(['/guiones', 'g1']);
    });

    it('tras eliminar una pregunta el orden enviado no tiene huecos', async () => {
      const { fixture, ctrl } = setup('g1');
      ctrl.expectOne((r) => r.method === 'GET').flush(guion());
      await asentar(fixture);

      api(fixture).quitarPregunta(1);
      await asentar(fixture);

      api(fixture).onSubmit();
      await asentar(fixture);

      const req = ctrl.expectOne((r) => r.method === 'PATCH');
      expect(req.request.body.preguntas).toEqual([
        { orden: 1, texto: 'Primera' },
        { orden: 2, texto: 'Tercera' },
      ]);
      req.flush(guion());
      await asentar(fixture);
    });

    it('el orden enviado sigue al orden visible tras mover', async () => {
      const { fixture, ctrl } = setup('g1');
      ctrl.expectOne((r) => r.method === 'GET').flush(guion());
      await asentar(fixture);

      api(fixture).moverPregunta(2, -1);
      await asentar(fixture);

      api(fixture).onSubmit();
      await asentar(fixture);

      const req = ctrl.expectOne((r) => r.method === 'PATCH');
      expect(req.request.body.preguntas.map((p: { texto: string }) => p.texto)).toEqual([
        'Primera',
        'Tercera',
        'Segunda',
      ]);
      req.flush(guion());
      await asentar(fixture);
    });
  });
});
