import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Contacto } from '../../../../core/api/contacto.model';
import { Entrevista } from '../../../../core/api/entrevista.model';
import { Guion } from '../../../../core/api/guion.model';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { AltaEntrevista } from './alta';

const BASE = '/ideas/i1/entrevistas';

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
    preguntas: [
      { id: 'p2', orden: 2, texto: '¿Cuánto te cuesta?' },
      { id: 'p1', orden: 1, texto: '¿Cómo lo resuelves hoy?' },
    ],
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    ...parcial,
  };
}

function entrevista(): Entrevista {
  return {
    id: 'e1',
    ideaId: 'i1',
    contactoId: 'c1',
    guionId: 'g1',
    respuestas: [],
    citas: [],
    estadoScoring: 'pendiente',
    score: null,
    ajuste: null,
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
  };
}

function pagina<T>(datos: T[]) {
  return { datos, paginacion: { pagina: 1, porPagina: 200, total: datos.length, totalPaginas: 1 } };
}

function setup(): { fixture: ComponentFixture<AltaEntrevista>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'i1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(AltaEntrevista);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<AltaEntrevista>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

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

interface ApiAlta {
  cambiarContacto(v: string): void;
  cambiarGuion(v: string): void;
  cambiarRespuesta(preguntaId: string, texto: string): void;
  confirmarCambioDeGuion(): void;
  cancelarCambioDeGuion(): void;
  citas: { set(v: unknown[]): void };
  onSubmit(): Promise<void>;
}

function api(fixture: ComponentFixture<AltaEntrevista>): ApiAlta {
  return fixture.componentInstance as unknown as ApiAlta;
}

function textareas(fixture: ComponentFixture<AltaEntrevista>): HTMLTextAreaElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.pregunta-respuesta textarea'),
  ) as HTMLTextAreaElement[];
}

/** Deja el formulario listo para enviar: contacto, guión y una respuesta. */
async function rellenarValido(fixture: ComponentFixture<AltaEntrevista>): Promise<void> {
  api(fixture).cambiarContacto('c1');
  api(fixture).cambiarGuion('g1');
  await asentar(fixture);
  api(fixture).cambiarRespuesta('p1', 'Lo resuelvo a mano');
  await asentar(fixture);
}

describe('AltaEntrevista', () => {
  it('los campos de respuesta los define el guión, en el orden de sus preguntas', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(ctrl);
    await asentar(fixture);

    expect(textareas(fixture)).toHaveLength(0);

    api(fixture).cambiarGuion('g1');
    await asentar(fixture);

    expect(textareas(fixture)).toHaveLength(2);
    const enunciados = Array.from(
      fixture.nativeElement.querySelectorAll('.pregunta-respuesta .enunciado'),
    ).map((e) => (e as HTMLElement).textContent?.trim());
    // El guión los trae desordenados; la vista los ordena por `orden`.
    expect(enunciados[0]).toContain('¿Cómo lo resuelves hoy?');
    expect(enunciados[1]).toContain('¿Cuánto te cuesta?');
  });

  it('el alta hace POST con contactoId, guionId y las respuestas con su preguntaId', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(ctrl);
    await asentar(fixture);
    await rellenarValido(fixture);

    void api(fixture).onSubmit();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'POST');
    expect(req.request.body).toEqual({
      contactoId: 'c1',
      guionId: 'g1',
      respuestas: [{ preguntaId: 'p1', texto: 'Lo resuelvo a mano' }],
    });
    const cuerpo = JSON.stringify(req.request.body);
    expect(cuerpo).not.toContain('ideaId');
    expect(cuerpo).not.toContain('ownerId');
    expect(cuerpo).not.toContain('score');
    req.flush(entrevista());
    await asentar(fixture);
  });

  it('tras el 201 navega al detalle de la entrevista creada', async () => {
    const { fixture, ctrl } = setup();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
    responderCatalogos(ctrl);
    await asentar(fixture);
    await rellenarValido(fixture);

    void api(fixture).onSubmit();
    await asentar(fixture);
    ctrl.expectOne((r) => r.method === 'POST').flush(entrevista());
    await asentar(fixture);

    expect(navegar).toHaveBeenCalledWith(['/ideas', 'i1', 'entrevistas', 'e1']);
  });

  it('sin contacto, sin guión o sin respuestas el envío queda bloqueado', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(ctrl);
    await asentar(fixture);

    const boton = () =>
      fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(boton().disabled).toBe(true);

    api(fixture).cambiarContacto('c1');
    api(fixture).cambiarGuion('g1');
    await asentar(fixture);
    // Con las preguntas presentes pero sin responder, sigue bloqueado.
    expect(boton().disabled).toBe(true);

    void api(fixture).onSubmit();
    await asentar(fixture);
    ctrl.expectNone((r) => r.method === 'POST');
  });

  it('el selector de contactos excluye entrevistados y descartados', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(ctrl, [
      contacto({ id: 'c1', nombre: 'Ana Ruiz', estado: 'agendado' }),
      contacto({ id: 'c2', nombre: 'Luis Paz', estado: 'entrevistado' }),
      contacto({ id: 'c3', nombre: 'Eva Sol', estado: 'descartado' }),
    ]);
    await asentar(fixture);

    const opciones = Array.from(fixture.nativeElement.querySelectorAll('option')).map((o) =>
      (o as HTMLOptionElement).textContent?.trim(),
    );
    expect(opciones).toContain('Ana Ruiz');
    expect(opciones).not.toContain('Luis Paz');
    expect(opciones).not.toContain('Eva Sol');
  });

  it('sin contactos entrevistables lo explica y enlaza al CRM, sin selector vacío', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(ctrl, [contacto({ estado: 'entrevistado' })]);
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ningún contacto de esta idea puede entrevistarse');
    expect(texto).toContain('Ir a los contactos');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });

  it('cambiar de guión con respuestas escritas pide confirmación', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(ctrl, [contacto()], [guion(), guion({ id: 'g2', nombre: 'Otro guión' })]);
    await asentar(fixture);
    await rellenarValido(fixture);

    api(fixture).cambiarGuion('g2');
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('se perderán las respuestas escritas');
    // Hasta confirmar, lo escrito sigue ahí.
    expect(textareas(fixture)[0].value).toBe('Lo resuelvo a mano');
  });

  it('confirmar el cambio de guión sustituye las preguntas y descarta lo escrito', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(
      ctrl,
      [contacto()],
      [
        guion(),
        guion({
          id: 'g2',
          nombre: 'Otro',
          preguntas: [{ id: 'z1', orden: 1, texto: '¿Y ahora?' }],
        }),
      ],
    );
    await asentar(fixture);
    await rellenarValido(fixture);

    api(fixture).cambiarGuion('g2');
    await asentar(fixture);
    api(fixture).confirmarCambioDeGuion();
    await asentar(fixture);

    expect(textareas(fixture)).toHaveLength(1);
    expect(textareas(fixture)[0].value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('¿Y ahora?');
  });

  it('cancelar el cambio conserva el guión y las respuestas', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(ctrl, [contacto()], [guion(), guion({ id: 'g2', nombre: 'Otro' })]);
    await asentar(fixture);
    await rellenarValido(fixture);

    api(fixture).cambiarGuion('g2');
    await asentar(fixture);
    api(fixture).cancelarCambioDeGuion();
    await asentar(fixture);

    expect(textareas(fixture)[0].value).toBe('Lo resuelvo a mano');
    expect(fixture.nativeElement.textContent).not.toContain('se perderán las respuestas');
  });

  it('sin respuestas escritas el cambio de guión es inmediato, sin confirmación', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(
      ctrl,
      [contacto()],
      [
        guion(),
        guion({
          id: 'g2',
          nombre: 'Otro',
          preguntas: [{ id: 'z1', orden: 1, texto: '¿Y ahora?' }],
        }),
      ],
    );
    await asentar(fixture);

    api(fixture).cambiarGuion('g1');
    await asentar(fixture);
    api(fixture).cambiarGuion('g2');
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).not.toContain('se perderán las respuestas');
    expect(fixture.nativeElement.textContent).toContain('¿Y ahora?');
  });

  it('un 422 ENTREVISTA_SIN_VINCULO se explica como vínculo inválido', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(ctrl);
    await asentar(fixture);
    await rellenarValido(fixture);

    void api(fixture).onSubmit();
    await asentar(fixture);
    ctrl
      .expectOne((r) => r.method === 'POST')
      .flush(
        { codigo: 'ENTREVISTA_SIN_VINCULO', mensaje: 'sin vínculo' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('no pertenece a esta idea');
    expect(texto).not.toContain('sin vínculo');
  });

  it('un 409 CONFLICTO se explica como contacto ya entrevistado o descartado', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(ctrl);
    await asentar(fixture);
    await rellenarValido(fixture);

    void api(fixture).onSubmit();
    await asentar(fixture);
    ctrl
      .expectOne((r) => r.method === 'POST')
      .flush(
        { codigo: 'CONFLICTO', mensaje: 'conflicto' },
        { status: 409, statusText: 'Conflict' },
      );
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('ya fue entrevistado o está descartado');
  });

  it('un 422 de validación se reparte campo a campo', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(ctrl);
    await asentar(fixture);
    await rellenarValido(fixture);

    void api(fixture).onSubmit();
    await asentar(fixture);
    ctrl
      .expectOne((r) => r.method === 'POST')
      .flush(
        {
          codigo: 'VALIDACION_FALLIDA',
          mensaje: 'inválido',
          detalles: [{ campo: 'contactoId', problema: 'Contacto obligatorio' }],
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('Contacto obligatorio');
  });

  it('las citas viajan sin clave local y las vacías se omiten', async () => {
    const { fixture, ctrl } = setup();
    responderCatalogos(ctrl);
    await asentar(fixture);
    await rellenarValido(fixture);

    api(fixture).citas.set([
      { claveLocal: 'cita-99', texto: 'Pierdo dos horas', contexto: 'en la demo' },
      { claveLocal: 'cita-100', texto: '   ', contexto: '' },
    ]);
    await asentar(fixture);

    void api(fixture).onSubmit();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.method === 'POST');
    expect(req.request.body.citas).toEqual([{ texto: 'Pierdo dos horas', contexto: 'en la demo' }]);
    expect(JSON.stringify(req.request.body)).not.toContain('claveLocal');
    req.flush(entrevista());
    await asentar(fixture);
  });
});
