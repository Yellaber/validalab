import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TokenRespuesta } from '../api/sesion.model';
import { Usuario } from '../api/usuario.model';
import { SesionService } from './sesion.service';

const BASE = environment.baseUrl;

const usuario: Usuario = {
  id: 'u1',
  email: 'ana@ejemplo.com',
  nombre: 'Ana',
  rol: 'validador',
  estado: 'activo',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
};
const token: TokenRespuesta = {
  accessToken: 'AT',
  tokenTipo: 'Bearer',
  expiraEn: 900,
  usuario,
};

function setup() {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    svc: TestBed.inject(SesionService),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('SesionService', () => {
  it('iniciarSesion guarda el access token en memoria y el usuario', () => {
    const { svc, ctrl } = setup();
    svc.iniciarSesion({ email: 'ana@ejemplo.com', password: 'x' }).subscribe();

    ctrl.expectOne(`${BASE}/usuarios/login`).flush(token);

    expect(svc.accessToken()).toBe('AT');
    expect(svc.usuario()?.id).toBe('u1');
    expect(svc.estaAutenticado()).toBe(true);
    // Ninguna credencial toca el almacenamiento accesible a JavaScript.
    expect(localStorage.length).toBe(0);
  });

  it('renovar (silent refresh) actualiza el access token', () => {
    const { svc, ctrl } = setup();
    svc.renovar().subscribe();

    ctrl.expectOne(`${BASE}/usuarios/refresh`).flush({ ...token, accessToken: 'AT2' });

    expect(svc.accessToken()).toBe('AT2');
    expect(svc.estaAutenticado()).toBe(true);
  });

  it('cerrarSesion limpia el estado aunque el logout del servidor falle', () => {
    const { svc, ctrl } = setup();
    svc.iniciarSesion({ email: 'ana@ejemplo.com', password: 'x' }).subscribe();
    ctrl.expectOne(`${BASE}/usuarios/login`).flush(token);

    svc.cerrarSesion().subscribe({ error: () => undefined });
    ctrl
      .expectOne(`${BASE}/usuarios/logout`)
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(svc.estaAutenticado()).toBe(false);
    expect(svc.accessToken()).toBeNull();
  });

  it('registrar no establece sesión por sí solo', () => {
    const { svc, ctrl } = setup();
    svc.registrar({ email: 'ana@ejemplo.com', nombre: 'Ana', password: 'xxxxxxxx' }).subscribe();

    ctrl.expectOne(`${BASE}/usuarios/registro`).flush(usuario);

    expect(svc.estaAutenticado()).toBe(false);
  });
});
