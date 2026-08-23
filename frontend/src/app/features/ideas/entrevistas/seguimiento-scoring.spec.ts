import { Injector, provideZonelessChangeDetection, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  INTERVALO_MS,
  MAX_INTENTOS,
  SeguimientoScoring,
  seguimientoScoring,
} from './seguimiento-scoring';

function setup(): { seguimiento: SeguimientoScoring; recargas: () => number } {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  let recargas = 0;
  const injector = TestBed.inject(Injector);
  const seguimiento = runInInjectionContext(injector, () =>
    seguimientoScoring(() => {
      recargas += 1;
    }),
  );
  return { seguimiento, recargas: () => recargas };
}

describe('seguimientoScoring', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('vuelve a consultar mientras el scoring está en curso', () => {
    const { seguimiento, recargas } = setup();

    seguimiento.sincronizar('procesando');
    expect(recargas()).toBe(0);

    vi.advanceTimersByTime(INTERVALO_MS);
    expect(recargas()).toBe(1);
  });

  it('para en cuanto el scoring termina', () => {
    const { seguimiento, recargas } = setup();

    seguimiento.sincronizar('procesando');
    vi.advanceTimersByTime(INTERVALO_MS);
    expect(recargas()).toBe(1);

    // Llega el resultado.
    seguimiento.sincronizar('puntuada');
    vi.advanceTimersByTime(INTERVALO_MS * 5);

    expect(recargas()).toBe(1);
    expect(seguimiento.activo()).toBe(false);
  });

  it('un scoring fallido tampoco se sigue consultando', () => {
    const { seguimiento, recargas } = setup();

    seguimiento.sincronizar('fallida');
    vi.advanceTimersByTime(INTERVALO_MS * 5);

    expect(recargas()).toBe(0);
  });

  it('una entrevista ya puntuada no programa ninguna consulta', () => {
    const { seguimiento, recargas } = setup();

    seguimiento.sincronizar('puntuada');
    vi.advanceTimersByTime(INTERVALO_MS * 10);

    expect(recargas()).toBe(0);
    expect(seguimiento.activo()).toBe(false);
  });

  it('se detiene al agotar los intentos y lo señala', () => {
    const { seguimiento, recargas } = setup();

    // Simula el ciclo real: cada recarga devuelve otra vez `procesando`.
    for (let i = 0; i < MAX_INTENTOS + 5; i += 1) {
      seguimiento.sincronizar('procesando');
      vi.advanceTimersByTime(INTERVALO_MS);
    }

    expect(recargas()).toBe(MAX_INTENTOS);
    expect(seguimiento.agotado()).toBe(true);
    expect(seguimiento.activo()).toBe(false);
  });

  it('reiniciar devuelve los intentos y permite seguir consultando', () => {
    const { seguimiento, recargas } = setup();

    for (let i = 0; i < MAX_INTENTOS + 1; i += 1) {
      seguimiento.sincronizar('procesando');
      vi.advanceTimersByTime(INTERVALO_MS);
    }
    expect(seguimiento.agotado()).toBe(true);

    seguimiento.reiniciar();
    expect(seguimiento.agotado()).toBe(false);

    seguimiento.sincronizar('procesando');
    vi.advanceTimersByTime(INTERVALO_MS);
    expect(recargas()).toBe(MAX_INTENTOS + 1);
  });

  it('terminar el scoring devuelve el contador a cero para un futuro re-disparo', () => {
    const { seguimiento } = setup();

    for (let i = 0; i < 5; i += 1) {
      seguimiento.sincronizar('procesando');
      vi.advanceTimersByTime(INTERVALO_MS);
    }
    seguimiento.sincronizar('puntuada');

    // Un re-disparo posterior dispone otra vez de todos los intentos.
    for (let i = 0; i < MAX_INTENTOS; i += 1) {
      seguimiento.sincronizar('procesando');
      vi.advanceTimersByTime(INTERVALO_MS);
    }
    expect(seguimiento.agotado()).toBe(true);
  });

  it('detener cancela la consulta programada', () => {
    const { seguimiento, recargas } = setup();

    seguimiento.sincronizar('procesando');
    seguimiento.detener();
    vi.advanceTimersByTime(INTERVALO_MS * 5);

    expect(recargas()).toBe(0);
  });

  it('destruir el componente cancela el seguimiento, sin temporizadores huérfanos', () => {
    const { seguimiento, recargas } = setup();

    seguimiento.sincronizar('procesando');
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(INTERVALO_MS * 5);

    expect(recargas()).toBe(0);
  });

  it('sin estado todavía no programa nada', () => {
    const { seguimiento, recargas } = setup();

    seguimiento.sincronizar(undefined);
    vi.advanceTimersByTime(INTERVALO_MS * 5);

    expect(recargas()).toBe(0);
  });
});
