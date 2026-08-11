import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
