import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Contacto } from '../../../../core/api/contacto.model';
import { Entrevista } from '../../../../core/api/entrevista.model';
import { Guion } from '../../../../core/api/guion.model';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { DetalleEntrevista } from './detalle';

const BASE = '/ideas/i1/entrevistas';

function entrevista(parcial: Partial<Entrevista> = {}): Entrevista {
  return {
    id: 'e1',
    ideaId: 'i1',
    contactoId: 'c1',
    guionId: 'g1',
    respuestas: [
      { preguntaId: 'p2', texto: 'Unas dos horas al día' },
      { preguntaId: 'p1', texto: 'Lo resuelvo a mano' },
    ],
    citas: [],
    estadoScoring: 'puntuada',
    score: null,
    ajuste: null,
    fechaCreacion: '2026-03-12T10:00:00.000Z',
    fechaActualizacion: '2026-03-12T10:00:00.000Z',
    ...parcial,
  };
}

function contacto(): Contacto {
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
  };
}

function guion(): Guion {
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
  };
}

function pagina<T>(datos: T[]) {
  return { datos, paginacion: { pagina: 1, porPagina: 200, total: datos.length, totalPaginas: 1 } };
}

function score(): NonNullable<Entrevista['score']> {
  return {
    score: 8,
    justificacion: 'Dolor confirmado y urgente',
    senales: ['dolor_confirmado'],
    confianza: 90,
  };
}

function api(fixture: ComponentFixture<DetalleEntrevista>) {
  return fixture.componentInstance as unknown as {
    modeloAjuste: { set(v: { scoreAjustado: number; nota: string }): void };
    onSubmitAjuste(): void;
    refrescarManual(): void;
  };
}

function setup(): { fixture: ComponentFixture<DetalleEntrevista>; ctrl: HttpTestingController } {
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
  const fixture = TestBed.createComponent(DetalleEntrevista);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<DetalleEntrevista>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function responderCatalogos(ctrl: HttpTestingController): void {
  ctrl.expectOne((r) => r.url.endsWith('/contactos')).flush(pagina([contacto()]));
  ctrl.expectOne((r) => r.url.endsWith('/guiones')).flush(pagina([guion()]));
}

function botonPorTexto(
  fixture: ComponentFixture<DetalleEntrevista>,
  texto: string,
): HTMLButtonElement | undefined {
  return (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
    (b) => (b.textContent ?? '').includes(texto),
  );
}

/** Resuelve entrevista, catálogos y el guión concreto que el detalle encadena. */
async function cargar(
  fixture: ComponentFixture<DetalleEntrevista>,
  ctrl: HttpTestingController,
  datos: Entrevista = entrevista(),
): Promise<void> {
  ctrl.expectOne((r) => r.url.endsWith(`${BASE}/e1`) && r.method === 'GET').flush(datos);
  responderCatalogos(ctrl);
  await asentar(fixture);
  ctrl.expectOne((r) => r.url.endsWith('/guiones/g1') && r.method === 'GET').flush(guion());
  await asentar(fixture);
}

describe('DetalleEntrevista', () => {
  it('muestra cada respuesta junto al texto de su pregunta, en el orden del guión', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    const items = Array.from(fixture.nativeElement.querySelectorAll('.respuestas-detalle li')).map(
      (li) => (li as HTMLElement).textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(items[0]).toContain('¿Cómo lo resuelves hoy?');
    expect(items[0]).toContain('Lo resuelvo a mano');
    expect(items[1]).toContain('¿Cuánto te cuesta?');
    expect(items[1]).toContain('Unas dos horas al día');
  });

  it('muestra el contacto y el guión por su nombre', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ana Ruiz');
    expect(texto).toContain('Descubrimiento de dolor');
  });

  it('muestra las citas con su contexto cuando lo tienen', async () => {
    const { fixture, ctrl } = setup();
    await cargar(
      fixture,
      ctrl,
      entrevista({
        citas: [
          { id: 'q1', texto: 'Pierdo dos horas al día', contexto: 'sobre el proceso actual' },
          { id: 'q2', texto: 'Pagaría por esto' },
        ],
      }),
    );

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Pierdo dos horas al día');
    expect(texto).toContain('sobre el proceso actual');
    expect(texto).toContain('Pagaría por esto');
  });

  it('renderiza el bloque de score cuando la entrevista está puntuada', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl, entrevista({ score: score() }));

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Dolor confirmado y urgente');
    expect(texto).toContain('dolor_confirmado');
    expect(texto).toContain('90%');
  });

  it('sin score no renderiza el bloque ni inventa valores', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl, entrevista({ estadoScoring: 'pendiente', score: null }));

    expect(fixture.nativeElement.querySelector('.bloque-score')).toBeNull();
  });

  it('un scoring fallido se explica y ofrece reintentar', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl, entrevista({ estadoScoring: 'fallida', score: null }));

    expect(fixture.nativeElement.textContent).toContain('El agente no pudo puntuar');
    expect(botonPorTexto(fixture, 'Reintentar el scoring')).toBeDefined();
  });

  it('re-puntuar envía POST y advierte del consumo del proveedor', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl, entrevista({ score: score() }));

    expect(fixture.nativeElement.textContent).toContain('consume del proveedor de IA');

    botonPorTexto(fixture, 'Volver a puntuar')!.click();
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.url.endsWith(`${BASE}/e1/puntuar`) && r.method === 'POST')
      .flush(entrevista({ estadoScoring: 'procesando', score: null }));
    await asentar(fixture);
  });

  describe('ajuste del score', () => {
    it('registra el ajuste con score y nota, sin enviar el bloque del agente', async () => {
      const { fixture, ctrl } = setup();
      await cargar(fixture, ctrl, entrevista({ score: score() }));

      botonPorTexto(fixture, 'Ajustar el score')!.click();
      await asentar(fixture);

      api(fixture).modeloAjuste.set({ scoreAjustado: 6, nota: 'Sobrevaloró la urgencia' });
      await asentar(fixture);
      api(fixture).onSubmitAjuste();
      await asentar(fixture);

      const req = ctrl.expectOne(
        (r) => r.url.endsWith(`${BASE}/e1/ajuste-score`) && r.method === 'POST',
      );
      expect(req.request.body).toEqual({ scoreAjustado: 6, nota: 'Sobrevaloró la urgencia' });
      expect(JSON.stringify(req.request.body)).not.toContain('justificacion');
      req.flush(
        entrevista({
          score: score(),
          ajuste: { scoreAjustado: 6, nota: 'Sobrevaloró la urgencia', fechaAjuste: 'x' },
        }),
      );
      await asentar(fixture);
    });

    it('sin nota la confirmación queda bloqueada y no se envía nada', async () => {
      const { fixture, ctrl } = setup();
      await cargar(fixture, ctrl, entrevista({ score: score() }));

      botonPorTexto(fixture, 'Ajustar el score')!.click();
      await asentar(fixture);
      api(fixture).modeloAjuste.set({ scoreAjustado: 6, nota: '   ' });
      await asentar(fixture);

      expect(botonPorTexto(fixture, 'Registrar ajuste')!.disabled).toBe(true);

      api(fixture).onSubmitAjuste();
      await asentar(fixture);
      ctrl.expectNone((r) => r.url.endsWith('/ajuste-score'));
    });

    it('un score fuera de rango bloquea el envío', async () => {
      const { fixture, ctrl } = setup();
      await cargar(fixture, ctrl, entrevista({ score: score() }));

      botonPorTexto(fixture, 'Ajustar el score')!.click();
      await asentar(fixture);
      api(fixture).modeloAjuste.set({ scoreAjustado: 12, nota: 'Motivo' });
      await asentar(fixture);

      expect(botonPorTexto(fixture, 'Registrar ajuste')!.disabled).toBe(true);

      api(fixture).onSubmitAjuste();
      await asentar(fixture);
      ctrl.expectNone((r) => r.url.endsWith('/ajuste-score'));
    });

    it('un 422 se reparte campo a campo', async () => {
      const { fixture, ctrl } = setup();
      await cargar(fixture, ctrl, entrevista({ score: score() }));

      botonPorTexto(fixture, 'Ajustar el score')!.click();
      await asentar(fixture);
      api(fixture).modeloAjuste.set({ scoreAjustado: 6, nota: 'Motivo' });
      await asentar(fixture);
      api(fixture).onSubmitAjuste();
      await asentar(fixture);

      ctrl
        .expectOne((r) => r.url.endsWith('/ajuste-score'))
        .flush(
          {
            codigo: 'VALIDACION_FALLIDA',
            mensaje: 'inválido',
            detalles: [{ campo: 'nota', problema: 'Nota demasiado corta' }],
          },
          { status: 422, statusText: 'Unprocessable Entity' },
        );
      await asentar(fixture);

      expect(fixture.nativeElement.textContent).toContain('Nota demasiado corta');
    });

    it('tras ajustar se ven ambos valores y la justificación del agente sigue ahí', async () => {
      const { fixture, ctrl } = setup();
      await cargar(
        fixture,
        ctrl,
        entrevista({
          score: score(),
          ajuste: { scoreAjustado: 6, nota: 'Sobrevaloró la urgencia', fechaAjuste: 'x' },
        }),
      );

      const texto = fixture.nativeElement.textContent as string;
      expect(texto).toContain('Score del agente');
      expect(texto).toContain('Tu ajuste');
      expect(texto).toContain('En los KPIs cuenta tu ajuste');
      expect(texto).toContain('Dolor confirmado y urgente');
    });
  });

  it('el borrado confirmado hace DELETE y vuelve al listado', async () => {
    const { fixture, ctrl } = setup();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
    await cargar(fixture, ctrl);

    botonPorTexto(fixture, 'Eliminar')!.click();
    await asentar(fixture);
    expect(fixture.nativeElement.textContent).toContain('volverá a poder entrevistarse');

    botonPorTexto(fixture, 'Sí, eliminar')!.click();
    await asentar(fixture);
    ctrl.expectOne((r) => r.url.endsWith(`${BASE}/e1`) && r.method === 'DELETE').flush(null);
    await asentar(fixture);

    expect(navegar).toHaveBeenCalledWith(['/ideas', 'i1', 'entrevistas']);
  });

  it('el borrado cancelado no emite ninguna petición', async () => {
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    botonPorTexto(fixture, 'Eliminar')!.click();
    await asentar(fixture);
    botonPorTexto(fixture, 'Cancelar')!.click();
    await asentar(fixture);

    ctrl.expectNone((r) => r.method === 'DELETE');
  });

  it('no usa window.confirm', async () => {
    const espia = vi.spyOn(window, 'confirm');
    const { fixture, ctrl } = setup();
    await cargar(fixture, ctrl);

    botonPorTexto(fixture, 'Eliminar')!.click();
    await asentar(fixture);

    expect(espia).not.toHaveBeenCalled();
    espia.mockRestore();
  });

  it('un 404 indica que la entrevista no existe', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(`${BASE}/e1`))
      .flush(
        { codigo: 'RECURSO_NO_ENCONTRADO', mensaje: 'no existe' },
        { status: 404, statusText: 'Not Found' },
      );
    responderCatalogos(ctrl);
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).toContain('Esta entrevista no existe');
  });

  it('un 403 no revela ningún dato de la entrevista', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(`${BASE}/e1`))
      .flush(
        { codigo: 'ACCESO_DENEGADO', mensaje: 'ajena' },
        { status: 403, statusText: 'Forbidden' },
      );
    responderCatalogos(ctrl);
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('No tienes acceso a esta entrevista');
    expect(texto).not.toContain('Ana Ruiz');
    expect(texto).not.toContain('Lo resuelvo a mano');
    expect(fixture.nativeElement.querySelector('.respuestas-detalle')).toBeNull();
    expect(botonPorTexto(fixture, 'Eliminar')).toBeUndefined();
  });
});
