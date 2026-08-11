import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Idea } from '../../../core/api/idea.model';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { DetalleIdea } from './detalle';

const BASE = '/ideas/i1';

const idea: Idea = {
  id: 'i1',
  ownerId: 'u1',
  titulo: 'Mi idea',
  problema: 'Un problema real',
  estado: 'borrador',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaActualizacion: '2026-01-01T00:00:00.000Z',
};

function setup(): { fixture: ComponentFixture<DetalleIdea>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'i1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(DetalleIdea);
  const ctrl = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, ctrl };
}

describe('DetalleIdea', () => {
  it('muestra el contenido y el estado de la idea propia', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET').flush(idea);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Mi idea');
    expect(fixture.nativeElement.textContent).toContain('Borrador');
  });

  it('archivar llama al endpoint y refleja el estado archivada', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush(idea);
    await fixture.whenStable();

    (fixture.componentInstance as unknown as { archivar(): void }).archivar();

    ctrl
      .expectOne((r) => r.url.endsWith(`${BASE}/archivar`) && r.method === 'POST')
      .flush({
        ...idea,
        estado: 'archivada',
      });
    // Deja resolver el `firstValueFrom` y que `reload()` reprograme la carga; luego
    // el efecto del `httpResource` emite el GET de recarga en la siguiente CD.
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE) && r.method === 'GET')
      .flush({
        ...idea,
        estado: 'archivada',
      });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Archivada');
    expect(fixture.nativeElement.textContent).toContain('Reabrir idea');
  });

  it('idea ajena (403) muestra acceso denegado sin revelar contenido', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(
        { codigo: 'ACCESO_DENEGADO', mensaje: 'denegado' },
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No tienes acceso');
    expect(fixture.nativeElement.textContent).not.toContain('Mi idea');
  });

  it('idea inexistente (404) muestra el estado no encontrada', async () => {
    const { fixture, ctrl } = setup();
    ctrl
      .expectOne((r) => r.url.endsWith(BASE))
      .flush(
        { codigo: 'RECURSO_NO_ENCONTRADO', mensaje: 'no existe' },
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('no existe');
  });

  it('un 409 al desarchivar muestra el mensaje sin romper la vista', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith(BASE)).flush({ ...idea, estado: 'archivada' });
    await fixture.whenStable();

    (fixture.componentInstance as unknown as { desarchivar(): void }).desarchivar();

    ctrl
      .expectOne((r) => r.url.endsWith(`${BASE}/desarchivar`))
      .flush(
        { codigo: 'CONFLICTO', mensaje: 'no archivada' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('no está archivada');
    // La vista sigue mostrando la idea, no se rompe.
    expect(fixture.nativeElement.textContent).toContain('Mi idea');
  });
});
