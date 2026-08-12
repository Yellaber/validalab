import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Umbral } from '../../../core/api/umbral.model';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { UmbralesIdea } from './umbrales';

const BASE = '/ideas/i1/umbrales';

/** Conjunto de prueba: dos grupos, una unidad con conversión y un KPI sin zona kill. */
const conjunto: Umbral[] = [
  {
    kpi: 'tasa_respuesta',
    grupo: 'outreach',
    unidad: 'porcentaje',
    umbralGo: 0.3,
    umbralKill: 0.1,
  },
  {
    kpi: 'tasa_agendamiento',
    grupo: 'outreach',
    unidad: 'porcentaje',
    umbralGo: 0.5,
    umbralKill: 0.2,
  },
  {
    kpi: 'volumen_evidencia',
    grupo: 'calidad_descubrimiento',
    unidad: 'conteo',
    umbralGo: 15,
    umbralKill: null,
  },
];

function setup(): { fixture: ComponentFixture<UmbralesIdea>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'i1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(UmbralesIdea);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

/** Fila (`.fila-umbral`) cuyo nombre de KPI coincide con el texto dado. */
function fila(fixture: ComponentFixture<UmbralesIdea>, nombre: string): HTMLElement {
  const filas = Array.from(fixture.nativeElement.querySelectorAll('.fila-umbral')) as HTMLElement[];
  const encontrada = filas.find((f) => (f.textContent ?? '').includes(nombre));
  if (!encontrada) {
    throw new Error(`No se encontró la fila "${nombre}"`);
  }
  return encontrada;
}

function entrada(f: HTMLElement, etiqueta: 'go' | 'kill'): HTMLInputElement | null {
  const inputs = Array.from(f.querySelectorAll('input')) as HTMLInputElement[];
  const prefijo = etiqueta === 'go' ? 'Umbral go' : 'Umbral kill';
  return inputs.find((i) => (i.getAttribute('aria-label') ?? '').startsWith(prefijo)) ?? null;
}

function botonGuardar(f: HTMLElement): HTMLButtonElement {
  const boton = f.querySelector('button');
  if (!boton) {
    throw new Error('La fila no tiene botón de guardar');
  }
  return boton as HTMLButtonElement;
}

async function escribir(
  fixture: ComponentFixture<UmbralesIdea>,
  input: HTMLInputElement,
  valor: string,
): Promise<void> {
  input.value = valor;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

/** Corre los microtasks pendientes y refresca, sin esperar a que no haya peticiones. */
async function asentar(fixture: ComponentFixture<UmbralesIdea>): Promise<void> {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
}

async function cargado(): Promise<{
  fixture: ComponentFixture<UmbralesIdea>;
  ctrl: HttpTestingController;
}> {
  const { fixture, ctrl } = setup();
  ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush(conjunto);
  await fixture.whenStable();
  return { fixture, ctrl };
}

describe('UmbralesIdea', () => {
  it('agrupa las filas por el grupo que viene en la respuesta', async () => {
    const { fixture } = await cargado();

    const grupos = Array.from(fixture.nativeElement.querySelectorAll('.grupo-kpi'));
    expect(grupos.length).toBe(2);
    expect((grupos[0] as HTMLElement).textContent).toContain('Alcance del outreach');
    expect((grupos[0] as HTMLElement).textContent).toContain('Tasa de respuesta');
    expect((grupos[0] as HTMLElement).textContent).toContain('Tasa de agendamiento');
    expect((grupos[1] as HTMLElement).textContent).toContain('Calidad del descubrimiento');
    expect((grupos[1] as HTMLElement).textContent).toContain('Volumen de evidencia');
  });

  it('renderiza un KPI sin etiqueta local degradando a su clave cruda', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush([
        ...conjunto,
        {
          kpi: 'kpi_futuro',
          grupo: 'grupo_futuro',
          unidad: 'ratio',
          umbralGo: 2,
          umbralKill: 1,
        } as unknown as Umbral,
      ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('kpi_futuro');
    expect(fixture.nativeElement.textContent).toContain('grupo_futuro');
    expect(fixture.nativeElement.querySelectorAll('.fila-umbral').length).toBe(4);
  });

  it('un KPI sin zona kill no ofrece control de kill', async () => {
    const { fixture } = await cargado();

    const f = fila(fixture, 'Volumen de evidencia');
    expect(entrada(f, 'go')).not.toBeNull();
    expect(entrada(f, 'kill')).toBeNull();
    expect(f.textContent).toContain('Sin zona kill');
  });

  it('el porcentaje se muestra en puntos porcentuales y se envía como tasa', async () => {
    const { fixture, ctrl } = await cargado();

    const f = fila(fixture, 'Tasa de respuesta');
    expect(entrada(f, 'go')!.value).toBe('30');
    expect(entrada(f, 'kill')!.value).toBe('10');

    await escribir(fixture, entrada(f, 'go')!, '35');
    botonGuardar(fila(fixture, 'Tasa de respuesta')).click();
    await asentar(fixture);

    const req = ctrl.expectOne(
      (r) => r.url.endsWith(`${BASE}/tasa_respuesta`) && r.method === 'PUT',
    );
    expect(req.request.body).toEqual({ umbralGo: 0.35, umbralKill: 0.1 });
    req.flush({ ...conjunto[0], umbralGo: 0.35 });
    await asentar(fixture);

    const guardada = fila(fixture, 'Tasa de respuesta');
    expect(guardada.textContent).toContain('Guardado');
    expect(entrada(guardada, 'go')!.value).toBe('35');
    // El PUT es autoritativo para su fila: no se recarga el conjunto (D3 del diseño).
    ctrl.expectNone((r) => r.method === 'GET');
  });

  it('el PUT de un KPI sin zona kill omite umbralKill', async () => {
    const { fixture, ctrl } = await cargado();

    await escribir(fixture, entrada(fila(fixture, 'Volumen de evidencia'), 'go')!, '20');
    botonGuardar(fila(fixture, 'Volumen de evidencia')).click();
    await asentar(fixture);

    const req = ctrl.expectOne(
      (r) => r.url.endsWith(`${BASE}/volumen_evidencia`) && r.method === 'PUT',
    );
    expect(req.request.body).toEqual({ umbralGo: 20 });
    expect('umbralKill' in (req.request.body as object)).toBe(false);
    req.flush({ ...conjunto[2], umbralGo: 20 });
    await fixture.whenStable();
  });

  it('muestra íntegro un valor más preciso que la entrada de su unidad', async () => {
    const { fixture, ctrl } = setup();
    const preciso: Umbral = { ...conjunto[0], umbralGo: 0.3333, umbralKill: 0.1 };
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([preciso]);
    await fixture.whenStable();

    expect(entrada(fila(fixture, 'Tasa de respuesta'), 'go')!.value).toBe('33.33');
  });

  it('un valor vigente, por preciso que sea, nunca bloquea su fila', async () => {
    // Invariante del change: la validación de encaje con la unidad es una regla de
    // entrada. Un `0.3333` vigente excede la precisión tecleable, pero es autoridad
    // del backend: si bloqueara la fila, el usuario no podría corregir el otro campo.
    const { fixture, ctrl } = setup();
    const preciso: Umbral = { ...conjunto[0], umbralGo: 0.3333, umbralKill: 0.1 };
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([preciso]);
    await fixture.whenStable();

    expect(fila(fixture, 'Tasa de respuesta').textContent).not.toContain('Admite como máximo');

    // …y el otro campo se puede editar y guardar, con el go intacto.
    await escribir(fixture, entrada(fila(fixture, 'Tasa de respuesta'), 'kill')!, '12');
    const f = fila(fixture, 'Tasa de respuesta');
    expect(botonGuardar(f).disabled).toBe(false);

    botonGuardar(f).click();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.method === 'PUT');
    expect(req.request.body).toEqual({ umbralGo: 0.3333, umbralKill: 0.12 });
    req.flush({ ...preciso, umbralKill: 0.12 });
    await asentar(fixture);
  });

  it('la regla kill ≤ go se aplica aunque el go no se haya editado', async () => {
    const { fixture, ctrl } = await cargado();

    // El go vigente es 30 %; se teclea un kill mayor sin tocar el go.
    await escribir(fixture, entrada(fila(fixture, 'Tasa de respuesta'), 'kill')!, '40');

    const f = fila(fixture, 'Tasa de respuesta');
    expect(f.textContent).toContain('no puede superar al go');
    expect(botonGuardar(f).disabled).toBe(true);
    ctrl.expectNone((r) => r.method === 'PUT');
  });

  it('editar solo el kill no degrada la precisión del go que no se tocó', async () => {
    // El backend puede guardar más precisión de la que se puede teclear. Reconstruir
    // el go desde su texto lo redondearía a la precisión de entrada, degradando en
    // silencio un valor que el usuario nunca editó.
    const { fixture, ctrl } = setup();
    const preciso: Umbral = { ...conjunto[0], umbralGo: 0.3333, umbralKill: 0.1 };
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([preciso]);
    await fixture.whenStable();

    expect(entrada(fila(fixture, 'Tasa de respuesta'), 'go')!.value).toBe('33.33');

    await escribir(fixture, entrada(fila(fixture, 'Tasa de respuesta'), 'kill')!, '12');
    botonGuardar(fila(fixture, 'Tasa de respuesta')).click();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.method === 'PUT');
    expect(req.request.body).toEqual({ umbralGo: 0.3333, umbralKill: 0.12 });
    req.flush({ ...preciso, umbralKill: 0.12 });
    await asentar(fixture);
  });

  it('editar solo el go no degrada el kill que no se tocó', async () => {
    const { fixture, ctrl } = setup();
    const preciso: Umbral = { ...conjunto[0], umbralGo: 0.5, umbralKill: 0.1234 };
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([preciso]);
    await fixture.whenStable();

    await escribir(fixture, entrada(fila(fixture, 'Tasa de respuesta'), 'go')!, '55');
    botonGuardar(fila(fixture, 'Tasa de respuesta')).click();
    await asentar(fixture);

    const req = ctrl.expectOne((r) => r.method === 'PUT');
    expect(req.request.body).toEqual({ umbralGo: 0.55, umbralKill: 0.1234 });
    req.flush({ ...preciso, umbralGo: 0.55 });
    await asentar(fixture);
  });

  it('teclear y volver al valor original cuenta como sin cambios', async () => {
    const { fixture, ctrl } = setup();
    const preciso: Umbral = { ...conjunto[0], umbralGo: 0.3333, umbralKill: 0.1 };
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush([preciso]);
    await fixture.whenStable();

    await escribir(fixture, entrada(fila(fixture, 'Tasa de respuesta'), 'go')!, '40');
    expect(botonGuardar(fila(fixture, 'Tasa de respuesta')).disabled).toBe(false);

    // Volver al texto original devuelve el campo a "no editado": ni se marca como
    // cambiado ni se le aplica la regla de decimales, pese a tener dos.
    await escribir(fixture, entrada(fila(fixture, 'Tasa de respuesta'), 'go')!, '33.33');
    const f = fila(fixture, 'Tasa de respuesta');
    expect(botonGuardar(f).disabled).toBe(true);
    expect(f.textContent).not.toContain('Admite como máximo');

    ctrl.expectNone((r) => r.method === 'PUT');
  });

  it('más decimales de los que admite la unidad se rechazan en vez de truncarse', async () => {
    const { fixture, ctrl } = await cargado();

    await escribir(fixture, entrada(fila(fixture, 'Tasa de respuesta'), 'go')!, '33.33');

    const f = fila(fixture, 'Tasa de respuesta');
    expect(f.textContent).toContain('Admite como máximo 1 decimal');
    expect(botonGuardar(f).disabled).toBe(true);

    botonGuardar(f).click();
    await asentar(fixture);
    ctrl.expectNone((r) => r.method === 'PUT');
  });

  it('sin cambios el guardado está deshabilitado y no emite petición', async () => {
    const { fixture, ctrl } = await cargado();

    const boton = botonGuardar(fila(fixture, 'Tasa de respuesta'));
    expect(boton.disabled).toBe(true);

    boton.click();
    await asentar(fixture);
    ctrl.expectNone((r) => r.method === 'PUT');
  });

  it('un umbral kill mayor que el go bloquea el guardado y explica el motivo', async () => {
    const { fixture, ctrl } = await cargado();

    await escribir(fixture, entrada(fila(fixture, 'Tasa de respuesta'), 'kill')!, '40');

    const f = fila(fixture, 'Tasa de respuesta');
    expect(f.textContent).toContain('no puede superar al go');
    expect(botonGuardar(f).disabled).toBe(true);

    botonGuardar(f).click();
    await asentar(fixture);
    ctrl.expectNone((r) => r.method === 'PUT');
  });

  it('un valor fuera del rango de su unidad bloquea el guardado', async () => {
    const { fixture } = await cargado();

    await escribir(fixture, entrada(fila(fixture, 'Volumen de evidencia'), 'go')!, '2.5');

    const f = fila(fixture, 'Volumen de evidencia');
    expect(f.textContent).toContain('entero');
    expect(botonGuardar(f).disabled).toBe(true);
  });

  it('un 422 se muestra en la fila que lo causó', async () => {
    const { fixture, ctrl } = await cargado();

    await escribir(fixture, entrada(fila(fixture, 'Tasa de respuesta'), 'go')!, '35');
    botonGuardar(fila(fixture, 'Tasa de respuesta')).click();
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.method === 'PUT')
      .flush(
        {
          codigo: 'VALIDACION_FALLIDA',
          mensaje: 'inválido',
          detalles: [{ campo: 'umbralGo', problema: 'Valor no admitido para este KPI' }],
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await asentar(fixture);

    expect(fila(fixture, 'Tasa de respuesta').textContent).toContain('Valor no admitido');
  });

  it('un KPI fuera del catálogo (404) se explica sin romper la vista', async () => {
    const { fixture, ctrl } = await cargado();

    await escribir(fixture, entrada(fila(fixture, 'Tasa de respuesta'), 'go')!, '35');
    botonGuardar(fila(fixture, 'Tasa de respuesta')).click();
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.method === 'PUT')
      .flush(
        { codigo: 'RECURSO_NO_ENCONTRADO', mensaje: 'no existe' },
        { status: 404, statusText: 'Not Found' },
      );
    await asentar(fixture);

    expect(fila(fixture, 'Tasa de respuesta').textContent).toContain('ya no existe en el catálogo');
    expect(fixture.nativeElement.querySelectorAll('.fila-umbral').length).toBe(3);
  });

  it('el fallo de una fila no descarta las ediciones pendientes de las demás', async () => {
    const { fixture, ctrl } = await cargado();

    await escribir(fixture, entrada(fila(fixture, 'Tasa de agendamiento'), 'go')!, '60');
    await escribir(fixture, entrada(fila(fixture, 'Tasa de respuesta'), 'go')!, '35');

    botonGuardar(fila(fixture, 'Tasa de respuesta')).click();
    await asentar(fixture);

    ctrl
      .expectOne((r) => r.url.endsWith(`${BASE}/tasa_respuesta`))
      .flush({ codigo: 'ERROR_INTERNO', mensaje: 'boom' }, { status: 500, statusText: 'Error' });
    await asentar(fixture);

    // La fila que falló muestra su error…
    expect(fila(fixture, 'Tasa de respuesta').textContent).toContain('No se pudo guardar');
    // …y la otra conserva intacto su borrador, lista para guardarse.
    const otra = fila(fixture, 'Tasa de agendamiento');
    expect(entrada(otra, 'go')!.value).toBe('60');
    expect(botonGuardar(otra).disabled).toBe(false);
  });

  it('no muestra KPIs calculados, veredictos ni restablecer al valor por defecto', async () => {
    const { fixture } = await cargado();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).not.toContain('Restablecer');
    expect(texto).not.toContain('por defecto');
    expect(texto).not.toContain('Personalizado');
    expect(texto).not.toContain('Veredicto');
    expect(texto).not.toContain('Valor actual');
  });

  it('un fallo de carga ofrece reintentar', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).error(new ProgressEvent('error'));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Reintentar');

    (fixture.nativeElement.querySelector('.error button') as HTMLButtonElement).click();
    await asentar(fixture);

    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush(conjunto);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Tasa de respuesta');
  });
});
