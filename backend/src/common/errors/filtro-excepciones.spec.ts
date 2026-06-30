import { ArgumentsHost, Logger, UnauthorizedException } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import { CodigoError, SobreError } from './codigo-error';
import {
  AccesoDenegadoException,
  ValidacionFallidaException,
} from './dominio.exception';
import { FiltroDeExcepciones } from './filtro-excepciones';

interface RespuestaCapturada {
  estado?: number;
  cuerpo?: SobreError;
}

function crearHost(): { host: ArgumentsHost; captura: RespuestaCapturada } {
  const captura: RespuestaCapturada = {};
  const respuesta = {
    status(codigo: number) {
      captura.estado = codigo;
      return this;
    },
    json(cuerpo: SobreError) {
      captura.cuerpo = cuerpo;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => respuesta,
      getRequest: () => ({}),
    }),
  } as unknown as ArgumentsHost;
  return { host, captura };
}

describe('FiltroDeExcepciones', () => {
  const filtro = new FiltroDeExcepciones();

  beforeAll(() => {
    // Silenciar el log del servidor para los casos de ERROR_INTERNO.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => jest.restoreAllMocks());

  it('normaliza una excepción de dominio al sobre Error con su estado', () => {
    const { host, captura } = crearHost();

    filtro.catch(new AccesoDenegadoException(), host);

    expect(captura.estado).toBe(403);
    expect(captura.cuerpo?.codigo).toBe(CodigoError.ACCESO_DENEGADO);
    expect(typeof captura.cuerpo?.mensaje).toBe('string');
  });

  it('conserva los detalles de una ValidacionFallidaException', () => {
    const { host, captura } = crearHost();
    const detalles = [{ campo: 'correo', problema: 'requerido' }];

    filtro.catch(
      new ValidacionFallidaException('Datos inválidos', detalles),
      host,
    );

    expect(captura.estado).toBe(422);
    expect(captura.cuerpo?.codigo).toBe(CodigoError.VALIDACION_FALLIDA);
    expect(captura.cuerpo?.detalles).toEqual(detalles);
  });

  it('traduce un error de validación Zod a VALIDACION_FALLIDA con detalles campo a campo', () => {
    const { host, captura } = crearHost();
    const zodError = z
      .object({ nombre: z.string(), edad: z.number() })
      .safeParse({ edad: 'x' }).error!;

    filtro.catch(new ZodValidationException(zodError), host);

    expect(captura.estado).toBe(422);
    expect(captura.cuerpo?.codigo).toBe(CodigoError.VALIDACION_FALLIDA);
    const campos = captura.cuerpo?.detalles?.map((d) => d.campo) ?? [];
    expect(campos).toEqual(expect.arrayContaining(['nombre', 'edad']));
  });

  it('mapea una HttpException de Nest al código del catálogo', () => {
    const { host, captura } = crearHost();

    filtro.catch(new UnauthorizedException(), host);

    expect(captura.estado).toBe(401);
    expect(captura.cuerpo?.codigo).toBe(CodigoError.NO_AUTENTICADO);
  });

  it('trata lo inesperado como ERROR_INTERNO sin filtrar el mensaje interno', () => {
    const { host, captura } = crearHost();

    filtro.catch(new Error('detalle interno secreto'), host);

    expect(captura.estado).toBe(500);
    expect(captura.cuerpo?.codigo).toBe(CodigoError.ERROR_INTERNO);
    expect(captura.cuerpo?.mensaje).not.toContain('secreto');
    expect(captura.cuerpo?.detalles).toBeUndefined();
  });
});
