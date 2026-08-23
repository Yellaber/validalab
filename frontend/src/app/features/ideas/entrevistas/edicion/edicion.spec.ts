import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Entrevista } from '../../../../core/api/entrevista.model';
import { Guion } from '../../../../core/api/guion.model';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { EdicionEntrevista } from './edicion';

const BASE = '/ideas/i1/entrevistas';

function entrevista(parcial: Partial<Entrevista> = {}): Entrevista {
  return {
    id: 'e1',
    ideaId: 'i1',
    contactoId: 'c1',
    guionId: 'g1',
    respuestas: [
      { preguntaId: 'p1', texto: 'Lo resuelvo a mano' },
      { preguntaId: 'p2', texto: 'Unas dos horas' },
    ],
    citas: [{ id: 'q1', texto: 'Pierdo dos horas al día' }],
    estadoScoring: 'puntuada',
    score: null,
    ajuste: null,
    fechaCreacion: '2026-03-12T10:00:00.000Z',
    fechaActualizacion: '2026-03-12T10:00:00.000Z',
    ...parcial,
  };
}

function guion(): Guion {
  return {
    id: 'g1',
    ownerId: 'u1',
    nombre: 'Descubrimiento de dolor',
    preguntas: [
      { id: 'p1', orden: 1, texto: '¿Cómo lo resuelves hoy?' },
      { id: 'p2', orden: 2, texto: '¿Cuánto te cuesta?' },
    ],
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
  };
}

function setup(): { fixture: ComponentFixture<EdicionEntrevista>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'id' ? 'i1' : 'e1') } } },
      },
    ],
  });
  const fixture = TestBed.createComponent(EdicionEntrevista);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<EdicionEntrevista>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

interface ApiEdicion {
  cambiarRespuesta(preguntaId: string, texto: string): void;
  citas: { set(v: unknown[]): void };
  onSubmit(): Promise<void>;
}

function api(fixture: ComponentFixture<EdicionEntrevista>): ApiEdicion {
  return fixture.componentInstance as unknown as ApiEdicion;
}

async function cargar(
  fixture: ComponentFixture<EdicionEntrevista>,
  ctrl: HttpTestingController,
  datos: Entrevista = entrevista(),
): Promise<void> {
  ctrl.expectOne((r) => r.url.endsWith(`${BASE}/e1`) && r.method === 'GET').flush(datos);
  await asentar(fixture);
  ctrl.expectOne((r) => r.url.endsWith('/guiones/g1') && r.method === 'GET').flush(guion());
  await asentar(fixture);
}

describe('EdicionEntrevista', () => {
  it('carga las respuestas emparejadas con sus preguntas, en orden', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    const areas = Array.from(
      fixture.nativeElement.querySelectorAll('textarea'),
    ) as HTMLTextAreaElement[];
    expect(areas.map((a) => a.value)).toEqual(['Lo resuelvo a mano', 'Unas dos horas']);
    expect(fixture.nativeElement.textContent).toContain('¿Cómo lo resuelves hoy?');
  });

  it('no ofrece selectores de contacto ni de guión', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    // El guión se muestra como dato, no como campo editable.
    expect(fixture.nativeElement.textContent).toContain('Guión usado');
  });

  it('avisa de la invalidación del score al modificar una respuesta', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    expect(fixture.nativeElement.textContent).not.toContain('volverá a puntuarse');

    api(fixture).cambiarRespuesta('p1', 'Lo resuelvo con una hoja de cálculo');
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('volverá a puntuarse');
  });

  it('no avisa cuando solo cambian las citas', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    api(fixture).citas.set([{ claveLocal: 'cita-1', texto: 'Otra cita', contexto: '' }]);
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).not.toContain('volverá a puntuarse');
  });

  it('el aviso desaparece si la respuesta vuelve a su valor original', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    api(fixture).cambiarRespuesta('p1', 'Otra cosa');
    await asentar(fixture);
    expect(fixture.nativeElement.textContent).toContain('volverá a puntuarse');

    api(fixture).cambiarRespuesta('p1', 'Lo resuelvo a mano');
    await asentar(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('volverá a puntuarse');
  });

  it('guarda con PATCH sin contactoId ni guionId y navega al detalle', async () => {
    const { fixture, ctrl } = setup();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
    await cargar(fixture, ctrl);

    api(fixture).cambiarRespuesta('p1', 'Corregido');
    await asentar(fixture);

    void api(fixture).onSubmit();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(`${BASE}/e1`) && r.method === 'PATCH');
    expect(req.request.body.respuestas).toEqual([
      { preguntaId: 'p1', texto: 'Corregido' },
      { preguntaId: 'p2', texto: 'Unas dos horas' },
    ]);
    const cuerpo = JSON.stringify(req.request.body);
    expect(cuerpo).not.toContain('contactoId');
    expect(cuerpo).not.toContain('guionId');
    expect(cuerpo).not.toContain('claveLocal');
    req.flush(entrevista());
    await asentar(fixture);

    expect(navegar).toHaveBeenCalledWith(['/ideas', 'i1', 'entrevistas', 'e1']);
  });

  it('conserva las citas cargadas y las reenvía sin su id', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    void api(fixture).onSubmit();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.method === 'PATCH');
    expect(req.request.body.citas).toEqual([{ texto: 'Pierdo dos horas al día' }]);
    req.flush(entrevista());
    await asentar(fixture);
  });
});
