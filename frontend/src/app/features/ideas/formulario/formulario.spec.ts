import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import { Idea } from '../../../core/api/idea.model';
import { IdeasService } from '../ideas.service';
import { FormularioIdea } from './formulario';

const idea: Idea = {
  id: 'i1',
  ownerId: 'u1',
  titulo: 'Idea',
  problema: 'Un problema',
  descripcion: 'desc',
  segmentoBeachhead: 'seg',
  estado: 'borrador',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaActualizacion: '2026-01-01T00:00:00.000Z',
};

interface CompTest {
  modelo: { set(v: Record<string, string>): void; (): Record<string, string> };
  onSubmit(): void;
}

function setup(idParam: string | null, ideas: Partial<IdeasService>) {
  const navegaciones: unknown[][] = [];
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: IdeasService, useValue: ideas },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => idParam } } },
      },
    ],
  });
  const router = TestBed.inject(Router);
  router.navigate = ((cmd: unknown[]) => {
    navegaciones.push(cmd);
    return Promise.resolve(true);
  }) as Router['navigate'];
  const fixture = TestBed.createComponent(FormularioIdea);
  return {
    fixture,
    comp: fixture.componentInstance as unknown as CompTest,
    navegaciones,
  };
}

describe('FormularioIdea', () => {
  it('en alta, un envío válido crea la idea y navega a su detalle', async () => {
    let recibido: unknown;
    const ideas: Partial<IdeasService> = {
      crear: ((datos: unknown) => {
        recibido = datos;
        return of({ ...idea, id: 'nueva' });
      }) as IdeasService['crear'],
    };
    const { fixture, comp, navegaciones } = setup(null, ideas);

    comp.modelo.set({
      titulo: 'Idea',
      descripcion: '',
      problema: 'Un problema',
      segmentoBeachhead: '',
    });
    comp.onSubmit();
    await fixture.whenStable();

    expect(recibido).toEqual({ titulo: 'Idea', problema: 'Un problema' });
    expect(navegaciones).toEqual([['/ideas', 'nueva']]);
  });

  it('la validación local bloquea el envío con el problema vacío', async () => {
    let llamado = false;
    const ideas: Partial<IdeasService> = {
      crear: (() => {
        llamado = true;
        return of(idea);
      }) as IdeasService['crear'],
    };
    const { fixture, comp } = setup(null, ideas);

    comp.modelo.set({ titulo: 'Idea', descripcion: '', problema: '', segmentoBeachhead: '' });
    comp.onSubmit();
    await fixture.whenStable();

    expect(llamado).toBe(false);
  });

  it('en edición carga la idea y un envío hace editar con su id', async () => {
    let editadoId: string | undefined;
    const ideas: Partial<IdeasService> = {
      consultar: (() => of(idea)) as IdeasService['consultar'],
      editar: ((id: string) => {
        editadoId = id;
        return of(idea);
      }) as IdeasService['editar'],
    };
    const { fixture, comp, navegaciones } = setup('i1', ideas);
    await fixture.whenStable();

    comp.onSubmit();
    await fixture.whenStable();

    expect(editadoId).toBe('i1');
    expect(navegaciones).toEqual([['/ideas', 'i1']]);
  });

  it('un VALIDACION_FALLIDA se muestra campo a campo', async () => {
    const ideas: Partial<IdeasService> = {
      crear: (() =>
        throwError(
          () =>
            new ErrorApi('VALIDACION_FALLIDA', 'inválido', [
              { campo: 'titulo', problema: 'Título ya usado' },
            ]),
        )) as IdeasService['crear'],
    };
    const { fixture, comp } = setup(null, ideas);

    comp.modelo.set({
      titulo: 'Idea',
      descripcion: '',
      problema: 'Un problema',
      segmentoBeachhead: '',
    });
    comp.onSubmit();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Título ya usado');
  });

  it('el formulario no modela ni expone el estado (go/pivote/kill)', () => {
    const { fixture, comp } = setup(null, { crear: (() => of(idea)) as IdeasService['crear'] });

    expect(Object.keys(comp.modelo())).not.toContain('estado');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });
});
