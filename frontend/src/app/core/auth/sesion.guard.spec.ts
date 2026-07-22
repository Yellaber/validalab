import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Route, UrlTree } from '@angular/router';
import { SesionService } from './sesion.service';
import { invitadoGuard, sesionGuard } from './sesion.guard';

function setup(autenticado: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: SesionService, useValue: { estaAutenticado: () => autenticado } },
    ],
  });
}

const ruta = null as unknown as Route;
const snapshot = null as never; // CanMatchFn recibe un tercer arg que los guards ignoran

describe('sesionGuard', () => {
  it('permite la activación cuando hay sesión', () => {
    setup(true);
    const resultado = TestBed.runInInjectionContext(() => sesionGuard(ruta, [], snapshot));
    expect(resultado).toBe(true);
  });

  it('redirige a /login sin sesión', () => {
    setup(false);
    const resultado = TestBed.runInInjectionContext(() => sesionGuard(ruta, [], snapshot));
    expect(resultado).toBeInstanceOf(UrlTree);
    expect((resultado as UrlTree).toString()).toBe('/login');
  });
});

describe('invitadoGuard', () => {
  it('deja pasar a un invitado (sin sesión)', () => {
    setup(false);
    const resultado = TestBed.runInInjectionContext(() => invitadoGuard(ruta, [], snapshot));
    expect(resultado).toBe(true);
  });

  it('redirige al shell a un usuario ya autenticado', () => {
    setup(true);
    const resultado = TestBed.runInInjectionContext(() => invitadoGuard(ruta, [], snapshot));
    expect(resultado).toBeInstanceOf(UrlTree);
    expect((resultado as UrlTree).toString()).toBe('/');
  });
});
