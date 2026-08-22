import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { SesionService } from '../../core/auth/sesion.service';
import { Usuario } from '../../core/api/usuario.model';
import { Shell } from './shell';

const usuario: Usuario = {
  id: 'u1',
  email: 'ana@ejemplo.com',
  nombre: 'Ana',
  rol: 'validador',
  estado: 'activo',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
};

function setup() {
  const navegaciones: string[] = [];
  let cerrado = false;
  const sesion = {
    usuario: signal<Usuario | null>(usuario),
    cerrarSesion: () => {
      cerrado = true;
      return of(undefined);
    },
  };
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: SesionService, useValue: sesion },
    ],
  });
  const router = TestBed.inject(Router);
  router.navigateByUrl = ((url: string) => {
    navegaciones.push(String(url));
    return Promise.resolve(true);
  }) as Router['navigateByUrl'];
  const fixture = TestBed.createComponent(Shell);
  return { fixture, navegaciones, estado: () => cerrado };
}

describe('Shell', () => {
  it('muestra la identidad del usuario en sesión', async () => {
    const { fixture } = setup();
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ana');
    expect(texto).toContain('ana@ejemplo.com');
  });

  it('cierra sesión y redirige a la pantalla pública', async () => {
    const { fixture, navegaciones, estado } = setup();
    await fixture.whenStable();

    (fixture.componentInstance as unknown as { cerrarSesion(): Promise<void> }).cerrarSesion();
    await fixture.whenStable();

    expect(estado()).toBe(true);
    expect(navegaciones).toEqual(['/login']);
  });
});

/** Destino de las rutas de prueba: al shell solo le importa la URL activa. */
@Component({ template: '' })
class Vacio {}

/** Setup con navegación real (sin `navigateByUrl` sustituido) para `routerLinkActive`. */
function setupNavegacion(): ComponentFixture<Shell> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([
        { path: 'ideas', component: Vacio },
        { path: 'ideas/:id/contactos', component: Vacio },
        { path: 'guiones', component: Vacio },
      ]),
      { provide: SesionService, useValue: { usuario: signal<Usuario | null>(usuario) } },
    ],
  });
  return TestBed.createComponent(Shell);
}

async function irA(fixture: ComponentFixture<Shell>, url: string): Promise<void> {
  await TestBed.inject(Router).navigateByUrl(url);
  await fixture.whenStable();
  fixture.detectChanges();
}

function enlaceDominio(fixture: ComponentFixture<Shell>, texto: string): HTMLAnchorElement {
  return (
    Array.from(fixture.nativeElement.querySelectorAll('.dominios a')) as HTMLAnchorElement[]
  ).find((a) => (a.textContent ?? '').trim() === texto)!;
}

describe('Shell — navegación entre dominios', () => {
  it('ofrece los dos dominios de primer nivel', async () => {
    const fixture = setupNavegacion();
    await irA(fixture, '/ideas');

    expect(enlaceDominio(fixture, 'Ideas')).toBeDefined();
    expect(enlaceDominio(fixture, 'Guiones')).toBeDefined();
  });

  it('señala como activo el dominio en el que está el usuario', async () => {
    const fixture = setupNavegacion();
    await irA(fixture, '/guiones');

    expect(enlaceDominio(fixture, 'Guiones').classList).toContain('activo');
    expect(enlaceDominio(fixture, 'Ideas').classList).not.toContain('activo');
  });

  it('el resaltado de Ideas sobrevive a una ruta anidada de una idea', async () => {
    const fixture = setupNavegacion();
    await irA(fixture, '/ideas/i1/contactos');

    // Con `exact: true` el resaltado se apagaría al entrar en cualquier detalle.
    expect(enlaceDominio(fixture, 'Ideas').classList).toContain('activo');
    expect(enlaceDominio(fixture, 'Guiones').classList).not.toContain('activo');
  });
});
