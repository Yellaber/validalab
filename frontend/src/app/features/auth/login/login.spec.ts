import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import { SesionService } from '../../../core/auth/sesion.service';
import { Login } from './login';

function setup(iniciarSesion: SesionService['iniciarSesion']) {
  const navegaciones: string[] = [];
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      // Router real (para RouterLink/ActivatedRoute), con navigateByUrl interceptado.
      provideRouter([]),
      { provide: SesionService, useValue: { iniciarSesion } },
    ],
  });
  const router = TestBed.inject(Router);
  router.navigateByUrl = ((url: string) => {
    navegaciones.push(String(url));
    return Promise.resolve(true);
  }) as Router['navigateByUrl'];
  const fixture = TestBed.createComponent(Login);
  return {
    fixture,
    comp: fixture.componentInstance as unknown as LoginTest,
    navegaciones,
  };
}

interface LoginTest {
  modelo: { set(v: { email: string; password: string }): void };
  errorGeneral(): string | null;
  onSubmit(): void;
}

describe('Login', () => {
  it('con credenciales válidas inicia sesión y navega al shell', async () => {
    let recibido: unknown;
    const iniciarSesion = ((datos: unknown) => {
      recibido = datos;
      return of({ id: 'u1' });
    }) as unknown as SesionService['iniciarSesion'];
    const { fixture, comp, navegaciones } = setup(iniciarSesion);

    comp.modelo.set({ email: 'ana@ejemplo.com', password: 'contrasena' });
    comp.onSubmit();
    await fixture.whenStable();

    expect(recibido).toEqual({ email: 'ana@ejemplo.com', password: 'contrasena' });
    expect(navegaciones).toEqual(['/']);
    expect(comp.errorGeneral()).toBeNull();
  });

  it('con credenciales inválidas muestra el error y no navega', async () => {
    const iniciarSesion = (() =>
      throwError(
        () => new ErrorApi('NO_AUTENTICADO', 'credenciales'),
      )) as unknown as SesionService['iniciarSesion'];
    const { fixture, comp, navegaciones } = setup(iniciarSesion);

    comp.modelo.set({ email: 'ana@ejemplo.com', password: 'mala' });
    comp.onSubmit();
    await fixture.whenStable();

    expect(comp.errorGeneral()).toBe('Email o contraseña incorrectos.');
    expect(navegaciones).toEqual([]);
  });

  it('no llama al backend si el formulario es inválido (email vacío)', async () => {
    let llamado = false;
    const iniciarSesion = (() => {
      llamado = true;
      return of({ id: 'u1' });
    }) as unknown as SesionService['iniciarSesion'];
    const { fixture, comp } = setup(iniciarSesion);

    comp.modelo.set({ email: '', password: 'contrasena' });
    comp.onSubmit();
    await fixture.whenStable();

    expect(llamado).toBe(false);
  });
});
