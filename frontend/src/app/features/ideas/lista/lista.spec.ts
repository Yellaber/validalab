import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Idea } from '../../../core/api/idea.model';
import { RespuestaPaginada } from '../../../core/api/paginacion.model';
import { ListaIdeas } from './lista';

const idea: Idea = {
  id: 'i1',
  ownerId: 'u1',
  titulo: 'Mi idea',
  problema: 'Un problema real',
  estado: 'borrador',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaActualizacion: '2026-01-01T00:00:00.000Z',
};

function pagina(datos: Idea[], total = datos.length): RespuestaPaginada<Idea> {
  return { datos, paginacion: { pagina: 1, porPagina: 20, total, totalPaginas: total ? 1 : 0 } };
}

function setup(): { fixture: ComponentFixture<ListaIdeas>; ctrl: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const fixture = TestBed.createComponent(ListaIdeas);
  const ctrl = TestBed.inject(HttpTestingController);
  // Ejecuta el efecto del `httpResource` para que emita la petición inicial (sin
  // esperar estabilidad: la petición sigue pendiente hasta que el test la resuelve).
  fixture.detectChanges();
  return { fixture, ctrl };
}

describe('ListaIdeas', () => {
  it('carga inicial pide con paginación y renderiza las ideas', async () => {
    const { fixture, ctrl } = setup();

    const req = ctrl.expectOne((r) => r.url.endsWith('/ideas') && r.method === 'GET');
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('porPagina')).toBe('20');
    req.flush(pagina([idea]));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Mi idea');
  });

  it('cambiar el filtro reemite la consulta con el estado', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith('/ideas')).flush(pagina([idea]));
    await fixture.whenStable();

    const comp = fixture.componentInstance as unknown as { cambiarFiltro(v: string): void };
    comp.cambiarFiltro('en_validacion');
    fixture.detectChanges();

    const req = ctrl.expectOne((r) => r.url.endsWith('/ideas'));
    expect(req.request.params.get('estado')).toBe('en_validacion');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(pagina([]));
    await fixture.whenStable();
  });

  it('página vacía muestra el estado vacío, no un error', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith('/ideas')).flush(pagina([], 0));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Todavía no tienes ideas');
    expect(fixture.nativeElement.querySelector('.error')).toBeNull();
  });

  it('un fallo de red muestra el estado de error con reintento', async () => {
    const { fixture, ctrl } = setup();
    ctrl.expectOne((r) => r.url.endsWith('/ideas')).error(new ProgressEvent('error'));
    await fixture.whenStable();

    const error = fixture.nativeElement.querySelector('.error');
    expect(error).not.toBeNull();
    expect(error.textContent).toContain('Reintentar');
  });
});
