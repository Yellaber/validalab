import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ErrorApi } from '../api/error-api.model';
import { errorInterceptor } from './error.interceptor';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('errorInterceptor', () => {
  it('preserva el codigo, mensaje y detalles del sobre de dominio', () => {
    const { http, ctrl } = setup();
    let capturado: unknown;
    http.get('/x').subscribe({ error: (e) => (capturado = e) });

    ctrl.expectOne('/x').flush(
      {
        codigo: 'VALIDACION_FALLIDA',
        mensaje: 'Datos inválidos',
        detalles: [{ campo: 'email', problema: 'formato' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(capturado).toBeInstanceOf(ErrorApi);
    const error = capturado as ErrorApi;
    expect(error.codigo).toBe('VALIDACION_FALLIDA');
    expect(error.message).toBe('Datos inválidos');
    expect(error.detalles).toEqual([{ campo: 'email', problema: 'formato' }]);
  });

  it('normaliza un fallo de red (status 0) a ERROR_RED', () => {
    const { http, ctrl } = setup();
    let capturado: unknown;
    http.get('/x').subscribe({ error: (e) => (capturado = e) });

    ctrl.expectOne('/x').error(new ProgressEvent('network error'));

    expect(capturado).toBeInstanceOf(ErrorApi);
    expect((capturado as ErrorApi).codigo).toBe('ERROR_RED');
  });

  it('cae a ERROR_INTERNO ante un codigo desconocido del servidor', () => {
    const { http, ctrl } = setup();
    let capturado: unknown;
    http.get('/x').subscribe({ error: (e) => (capturado = e) });

    ctrl
      .expectOne('/x')
      .flush({ codigo: 'INVENTADO', mensaje: 'raro' }, { status: 500, statusText: 'Server Error' });

    expect((capturado as ErrorApi).codigo).toBe('ERROR_INTERNO');
  });
});
