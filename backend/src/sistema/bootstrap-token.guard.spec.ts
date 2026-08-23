import { ExecutionContext, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { NoAutenticadoException } from '../common/errors/dominio.exception';
import {
  BootstrapTokenGuard,
  CABECERA_BOOTSTRAP,
} from './bootstrap-token.guard';

const SECRETO = 'a'.repeat(64);

function crearContexto(headers: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

function crearGuard(token?: string): BootstrapTokenGuard {
  const config = { bootstrap: { token } } as unknown as AppConfigService;
  return new BootstrapTokenGuard(config);
}

describe('BootstrapTokenGuard', () => {
  beforeEach(() => {
    // El guard registra el motivo real del rechazo; se silencia para no ensuciar
    // la salida de los tests.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deja pasar cuando el secreto coincide', () => {
    const contexto = crearContexto({ [CABECERA_BOOTSTRAP]: SECRETO });

    expect(crearGuard(SECRETO).canActivate(contexto)).toBe(true);
  });

  it('rechaza cuando falta la cabecera', () => {
    expect(() => crearGuard(SECRETO).canActivate(crearContexto({}))).toThrow(
      NoAutenticadoException,
    );
  });

  it('rechaza una cabecera vacía', () => {
    const contexto = crearContexto({ [CABECERA_BOOTSTRAP]: '' });

    expect(() => crearGuard(SECRETO).canActivate(contexto)).toThrow(
      NoAutenticadoException,
    );
  });

  it('rechaza un secreto que no coincide', () => {
    const contexto = crearContexto({ [CABECERA_BOOTSTRAP]: 'b'.repeat(64) });

    expect(() => crearGuard(SECRETO).canActivate(contexto)).toThrow(
      NoAutenticadoException,
    );
  });

  it('rechaza un secreto de longitud distinta sin que timingSafeEqual lance', () => {
    const contexto = crearContexto({ [CABECERA_BOOTSTRAP]: 'a'.repeat(32) });

    // Si la longitud no se comprobara aparte, `timingSafeEqual` lanzaría un
    // RangeError en vez de traducirse al 401 del contrato.
    expect(() => crearGuard(SECRETO).canActivate(contexto)).toThrow(
      NoAutenticadoException,
    );
  });

  it('rechaza toda petición cuando el servidor no tiene secreto configurado', () => {
    const contexto = crearContexto({ [CABECERA_BOOTSTRAP]: SECRETO });

    // El fallo por defecto es denegar: sin secreto no hay forma de autorizar.
    expect(() => crearGuard(undefined).canActivate(contexto)).toThrow(
      NoAutenticadoException,
    );
  });

  it('deja el motivo del rechazo en los registros del servidor', () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    expect(() => crearGuard(undefined).canActivate(crearContexto({}))).toThrow(
      NoAutenticadoException,
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('BOOTSTRAP_TOKEN no está configurado'),
    );
  });

  it('no acepta un accessToken en Authorization como sustituto del secreto', () => {
    const contexto = crearContexto({ authorization: 'Bearer un-token-valido' });

    expect(() => crearGuard(SECRETO).canActivate(contexto)).toThrow(
      NoAutenticadoException,
    );
  });

  it('devuelve el mismo error genérico en todos los caminos de fallo', () => {
    const sinCabecera = () =>
      crearGuard(SECRETO).canActivate(crearContexto({}));
    const noCoincide = () =>
      crearGuard(SECRETO).canActivate(
        crearContexto({ [CABECERA_BOOTSTRAP]: 'b'.repeat(64) }),
      );
    const sinSecretoEnServidor = () =>
      crearGuard(undefined).canActivate(
        crearContexto({ [CABECERA_BOOTSTRAP]: SECRETO }),
      );

    // El cliente no puede distinguir por qué falló: ni si el sistema ya está
    // inicializado, ni si el servidor tiene secreto configurado.
    const mensajes = [sinCabecera, noCoincide, sinSecretoEnServidor].map(
      (fn) => {
        try {
          fn();
          return 'no lanzó';
        } catch (error) {
          return (error as Error).message;
        }
      },
    );

    expect(new Set(mensajes).size).toBe(1);
  });
});
