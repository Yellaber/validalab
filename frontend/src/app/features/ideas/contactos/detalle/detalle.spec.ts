import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Contacto } from '../../../../core/api/contacto.model';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { DetalleContacto } from './detalle';

const BASE = '/ideas/i1/contactos/c1';

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

function setup(): { fixture: ComponentFixture<DetalleContacto>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: { get: (k: string) => (k === 'id' ? 'i1' : 'c1') } },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(DetalleContacto);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<DetalleContacto>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function botonPorTexto(
  fixture: ComponentFixture<DetalleContacto>,
  texto: string,
): HTMLButtonElement | undefined {
  const botones = Array.from(
    fixture.nativeElement.querySelectorAll('button'),
  ) as HTMLButtonElement[];
  return botones.find((b) => (b.textContent ?? '').includes(texto));
}

function api(fixture: ComponentFixture<DetalleContacto>) {
  return fixture.componentInstance as unknown as {
    transicionar(estado: string): void;
    registrarToque(): void;
    cambiarFechaToque(v: string): void;
    pedirEliminar(): void;
    cancelarEliminar(): void;
    confirmarEliminar(): Promise<void>;
  };
}

async function cargado(
  parcial: Partial<Contacto> = {},
): Promise<{ fixture: ComponentFixture<DetalleContacto>; ctrl: HttpTestingController }> {
  const { fixture, ctrl } = setup();
  ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush(contacto(parcial));
  await fixture.whenStable();
  return { fixture, ctrl };
}

describe('DetalleContacto', () => {
  it('muestra el contenido, el estado del embudo y los toques', async () => {
    const { fixture } = await cargado({
      primerToqueEn: '2026-03-12T10:00:00.000Z',
      notas: 'Muy receptiva',
    });

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Ana Ruiz');
    expect(texto).toContain('CTO en fintech');
    expect(texto).toContain('LinkedIn');
    expect(texto).toContain('Por contactar');
    expect(texto).toContain('Primer toque');
    expect(texto).toContain('Muy receptiva');
  });

  it('ofrece solo destinos alcanzables y nunca entrevistado', async () => {
    const { fixture } = await cargado({ estado: 'agendado' });

    expect(botonPorTexto(fixture, 'Descartar')).toBeDefined();
    expect(botonPorTexto(fixture, 'Marcar entrevistado')).toBeUndefined();
    // …y la vista explica por qué ese estado no está entre las acciones.
    expect(fixture.nativeElement.textContent).toContain('no se asigna a mano');
  });

  it('transicionar emite el POST a /estado y refleja el nuevo estado', async () => {
    const { fixture, ctrl } = await cargado();

    api(fixture).transicionar('contactado');
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(`${BASE}/estado`) && r.method === 'POST');
    expect(req.request.body).toEqual({ estado: 'contactado' });
    req.flush(contacto({ estado: 'contactado' }));
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET')
      .flush(contacto({ estado: 'contactado' }));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Contactado');
  });

  it('registrar un toque sin fecha envía cuerpo vacío', async () => {
    const { fixture, ctrl } = await cargado();

    api(fixture).registrarToque();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(`${BASE}/toques`) && r.method === 'POST');
    expect(req.request.body).toEqual({});
    req.flush(contacto({ primerToqueEn: '2026-03-12T10:00:00.000Z' }));
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET')
      .flush(contacto({ primerToqueEn: '2026-03-12T10:00:00.000Z' }));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Primer toque');
  });

  it('con dos toques no se ofrece la acción y se explica el límite', async () => {
    const { fixture, ctrl } = await cargado({
      primerToqueEn: '2026-03-12T10:00:00.000Z',
      segundoToqueEn: '2026-03-19T10:00:00.000Z',
    });

    expect(botonPorTexto(fixture, 'Registrar toque')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('los dos toques que permite el método');
    ctrl.expectNone((r) => r.url.endsWith(`${BASE}/toques`));
  });

  it('el 409 de transición y el de toque dan mensajes distintos', async () => {
    const { fixture, ctrl } = await cargado();

    api(fixture).transicionar('agendado');
    await asentar(fixture);
    ctrl
      .expectOne((r) => r.url.endsWith(`${BASE}/estado`))
      .flush({ codigo: 'CONFLICTO', mensaje: 'x' }, { status: 409, statusText: 'Conflict' });
    await asentar(fixture);

    const mensajeTransicion = fixture.nativeElement.textContent as string;
    expect(mensajeTransicion).toContain('no está permitido desde el estado actual');

    api(fixture).registrarToque();
    await asentar(fixture);
    ctrl
      .expectOne((r) => r.url.endsWith(`${BASE}/toques`))
      .flush({ codigo: 'CONFLICTO', mensaje: 'x' }, { status: 409, statusText: 'Conflict' });
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('ya tiene los dos toques');
    expect(texto).not.toContain('no está permitido desde el estado actual');
  });

  it('eliminar exige confirmación: cancelar no emite petición', async () => {
    const { fixture, ctrl } = await cargado();

    api(fixture).pedirEliminar();
    await asentar(fixture);
    expect(fixture.nativeElement.textContent).toContain('¿Eliminar este contacto?');

    api(fixture).cancelarEliminar();
    await asentar(fixture);

    ctrl.expectNone((r) => r.method === 'DELETE');
    expect(fixture.nativeElement.textContent).toContain('Ana Ruiz');
  });

  it('eliminar confirmado emite el DELETE', async () => {
    const { fixture, ctrl } = await cargado();

    api(fixture).pedirEliminar();
    await asentar(fixture);
    void api(fixture).confirmarEliminar();
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'DELETE')
      .flush(null, { status: 204, statusText: 'No Content' });
    await asentar(fixture);
  });

  it('un contacto ajeno (403) no revela ningún dato', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(
        { codigo: 'ACCESO_DENEGADO', mensaje: 'denegado' },
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('No tienes acceso a este contacto');
    expect(texto).not.toContain('Ana Ruiz');
    expect(texto).not.toContain('CTO');
    expect(texto).not.toContain('Toques de outreach');
  });

  it('un contacto inexistente (404) se muestra como no encontrado', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(
        { codigo: 'RECURSO_NO_ENCONTRADO', mensaje: 'no existe' },
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Este contacto no existe');
  });
});
