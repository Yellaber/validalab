import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Contacto } from '../../../../core/api/contacto.model';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { FormularioContacto } from './formulario';

const BASE = '/ideas/i1/contactos';

function contacto(parcial: Partial<Contacto> = {}): Contacto {
  return {
    id: 'c1',
    ideaId: 'i1',
    nombre: 'Ana Ruiz',
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

/** `idContacto` presente → modo edición; ausente → alta. */
function setup(idContacto: string | null = null): {
  fixture: ComponentFixture<FormularioContacto>;
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
        useValue: {
          snapshot: { paramMap: { get: (k: string) => (k === 'id' ? 'i1' : idContacto) } },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(FormularioContacto);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

async function asentar(fixture: ComponentFixture<FormularioContacto>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

function botonPorTexto(
  fixture: ComponentFixture<FormularioContacto>,
  texto: string,
): HTMLButtonElement | undefined {
  const botones = Array.from(
    fixture.nativeElement.querySelectorAll('button'),
  ) as HTMLButtonElement[];
  return botones.find((b) => (b.textContent ?? '').includes(texto));
}

function api(fixture: ComponentFixture<FormularioContacto>) {
  return fixture.componentInstance as unknown as {
    modelo: { set(v: Record<string, string>): void; (): Record<string, string> };
    cambiarOrigen(v: string): void;
    onSubmit(): void;
  };
}

describe('FormularioContacto', () => {
  it('el alta hace POST con el contenido y sin campos derivados', async () => {
    const { fixture, ctrl } = setup();
    await fixture.whenStable();

    api(fixture).modelo.set({
      nombre: 'Ana Ruiz',
      perfil: 'CTO',
      enlace: '',
      canal: 'correo',
      origen: 'comunidad',
      referidoPorId: '',
      notas: '',
    });
    api(fixture).onSubmit();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'POST');
    expect(req.request.body).toEqual({
      nombre: 'Ana Ruiz',
      canal: 'correo',
      origen: 'comunidad',
      perfil: 'CTO',
    });
    const cuerpo = JSON.stringify(req.request.body);
    expect(cuerpo).not.toContain('estado');
    expect(cuerpo).not.toContain('ToqueEn');
    expect(cuerpo).not.toContain('referidoPorId');
    req.flush(contacto());
    await asentar(fixture);
  });

  it('con el nombre vacío el envío queda bloqueado y no se emite la petición', async () => {
    const { fixture, ctrl } = setup();
    await fixture.whenStable();

    expect(botonPorTexto(fixture, 'Crear contacto')!.disabled).toBe(true);

    api(fixture).onSubmit();
    await asentar(fixture);

    ctrl.expectNone((r) => r.method === 'POST');
  });

  it('el formulario no ofrece control de estado ni de fechas de toque', async () => {
    const { fixture } = setup();
    await fixture.whenStable();

    const etiquetas = fixture.nativeElement.textContent as string;
    expect(etiquetas).not.toContain('Estado');
    expect(etiquetas).not.toContain('toque');
    expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeNull();
  });

  it('un 422 se muestra campo a campo', async () => {
    const { fixture, ctrl } = setup();
    await fixture.whenStable();

    api(fixture).modelo.set({
      nombre: 'A',
      perfil: '',
      enlace: '',
      canal: 'linkedin',
      origen: 'busqueda_directa',
      referidoPorId: '',
      notas: '',
    });
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

  it('elegir origen referido pide los candidatos y excluye el contacto en edición', async () => {
    const { fixture, ctrl } = setup('c1');
    ctrl.expectOne((r) => r.url.endsWith(`${BASE}/c1`) && r.method === 'GET').flush(contacto());
    await asentar(fixture);

    api(fixture).cambiarOrigen('referido');
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET');
    req.flush({
      datos: [contacto(), contacto({ id: 'c2', nombre: 'Luis Paz' })],
      paginacion: { pagina: 1, porPagina: 100, total: 2, totalPaginas: 1 },
    });
    await asentar(fixture);

    const opciones = Array.from(fixture.nativeElement.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).textContent?.trim() ?? '',
    );
    expect(opciones).toContain('Luis Paz');
    // El contacto en edición no puede referirse a sí mismo.
    expect(opciones).not.toContain('Ana Ruiz');
  });

  it('con origen distinto de referido no hay selector y el cuerpo no lleva referidoPorId', async () => {
    const { fixture, ctrl } = setup();
    await fixture.whenStable();

    api(fixture).modelo.set({
      nombre: 'Ana Ruiz',
      perfil: '',
      enlace: '',
      canal: 'linkedin',
      origen: 'busqueda_directa',
      referidoPorId: 'c9',
      notas: '',
    });
    await asentar(fixture);

    expect(fixture.nativeElement.textContent).not.toContain('Referido por');

    api(fixture).onSubmit();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.method === 'POST');
    expect(JSON.stringify(req.request.body)).not.toContain('referidoPorId');
    req.flush(contacto());
    await asentar(fixture);
  });

  it('la edición carga el contacto y hace PATCH', async () => {
    const { fixture, ctrl } = setup('c1');
    ctrl
      .expectOne((r) => r.url.endsWith(`${BASE}/c1`) && r.method === 'GET')
      .flush(contacto({ perfil: 'CTO' }));
    await asentar(fixture);

    api(fixture).modelo.set({
      nombre: 'Ana Ruiz',
      perfil: 'VP de Ingeniería',
      enlace: '',
      canal: 'linkedin',
      origen: 'busqueda_directa',
      referidoPorId: '',
      notas: '',
    });
    api(fixture).onSubmit();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.url.endsWith(`${BASE}/c1`) && r.method === 'PATCH');
    expect(req.request.body).toEqual({
      nombre: 'Ana Ruiz',
      canal: 'linkedin',
      origen: 'busqueda_directa',
      perfil: 'VP de Ingeniería',
    });
    req.flush(contacto({ perfil: 'VP de Ingeniería' }));
    await asentar(fixture);
  });
});
