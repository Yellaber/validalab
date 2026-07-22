import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { TokenRespuesta } from '../api/sesion.model';
import { autorizacionInterceptor } from './autorizacion.interceptor';
import { SesionService } from './sesion.service';

interface OpcionesMock {
  token: string | null;
  autenticado: boolean;
  renovar: Observable<TokenRespuesta>;
}

function setup(opts: Partial<OpcionesMock> = {}) {
  const config: OpcionesMock = {
    token: opts.token ?? 'AT',
    autenticado: opts.autenticado ?? true,
    renovar: opts.renovar ?? of({} as TokenRespuesta),
  };
  const estado = { limpiado: false };
  const sesion = {
    accessToken: () => config.token,
    estaAutenticado: () => config.autenticado,
    renovar: () => config.renovar,
    limpiar: () => (estado.limpiado = true),
  };

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([autorizacionInterceptor])),
      provideHttpClientTesting(),
      { provide: SesionService, useValue: sesion },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    ctrl: TestBed.inject(HttpTestingController),
    estado,
  };
}

function respuesta(accessToken: string): TokenRespuesta {
  return {
    accessToken,
    tokenTipo: 'Bearer',
    expiraEn: 900,
    usuario: {
      id: 'u1',
      email: 'a@e.com',
      nombre: 'A',
      rol: 'validador',
      estado: 'activo',
      fechaCreacion: '2026-01-01T00:00:00.000Z',
    },
  };
}

describe('autorizacionInterceptor', () => {
  it('adjunta Bearer y withCredentials en una petición autenticada', () => {
    const { http, ctrl } = setup({ token: 'AT' });
    http.get('/api/ideas').subscribe();

    const req = ctrl.expectOne('/api/ideas');
    expect(req.request.headers.get('Authorization')).toBe('Bearer AT');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('no adjunta Bearer a un endpoint público, pero sí withCredentials', () => {
    const { http, ctrl } = setup({ token: 'AT' });
    http.post('/usuarios/login', {}).subscribe();

    const req = ctrl.expectOne('/usuarios/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('ante 401 renueva una vez y reintenta con el token nuevo', () => {
    const { http, ctrl } = setup({ token: 'AT', renovar: of(respuesta('AT2')) });
    let resultado: unknown;
    http.get('/api/ideas').subscribe({ next: (r) => (resultado = r) });

    ctrl.expectOne('/api/ideas').flush(null, { status: 401, statusText: 'Unauthorized' });

    const reintento = ctrl.expectOne('/api/ideas');
    expect(reintento.request.headers.get('Authorization')).toBe('Bearer AT2');
    reintento.flush({ ok: true });

    expect(resultado).toEqual({ ok: true });
  });

  it('si la renovación falla, cierra la sesión y propaga el error', () => {
    const { http, ctrl, estado } = setup({
      token: 'AT',
      renovar: throwError(() => new Error('refresh 401')),
    });
    let error: unknown;
    http.get('/api/ideas').subscribe({ error: (e) => (error = e) });

    ctrl.expectOne('/api/ideas').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(estado.limpiado).toBe(true);
    expect(error).toBeTruthy();
    ctrl.verify();
  });
});
