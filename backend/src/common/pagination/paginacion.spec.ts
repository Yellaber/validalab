import { ArgumentMetadata } from '@nestjs/common';
import { ZodValidationException, ZodValidationPipe } from 'nestjs-zod';
import { PaginacionQueryDto, paginacionQuerySchema } from './paginacion.dto';
import { crearRespuestaPaginada } from './respuesta-paginada';

describe('paginacionQuerySchema', () => {
  it('aplica los valores por defecto cuando se omiten', () => {
    expect(paginacionQuerySchema.parse({})).toEqual({
      pagina: 1,
      porPagina: 20,
    });
  });

  it('coerciona los parámetros de string a número', () => {
    expect(
      paginacionQuerySchema.parse({ pagina: '2', porPagina: '50' }),
    ).toEqual({
      pagina: 2,
      porPagina: 50,
    });
  });

  it('rechaza porPagina fuera de rango', () => {
    expect(paginacionQuerySchema.safeParse({ porPagina: 500 }).success).toBe(
      false,
    );
    expect(paginacionQuerySchema.safeParse({ porPagina: 0 }).success).toBe(
      false,
    );
  });

  it('rechaza pagina menor que 1', () => {
    expect(paginacionQuerySchema.safeParse({ pagina: 0 }).success).toBe(false);
  });
});

describe('PaginacionQueryDto vía ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe();
  const metadata: ArgumentMetadata = {
    type: 'query',
    metatype: PaginacionQueryDto,
    data: undefined,
  };

  it('porPagina fuera de rango lanza ZodValidationException (→ VALIDACION_FALLIDA)', () => {
    expect(() => {
      pipe.transform({ porPagina: '500' }, metadata);
    }).toThrow(ZodValidationException);
  });
});

describe('crearRespuestaPaginada', () => {
  it('calcula totalPaginas (45 elementos, 20 por página → 3)', () => {
    const respuesta = crearRespuestaPaginada(['a', 'b'], 45, {
      pagina: 1,
      porPagina: 20,
    });

    expect(respuesta.paginacion).toEqual({
      pagina: 1,
      porPagina: 20,
      total: 45,
      totalPaginas: 3,
    });
    expect(respuesta.datos).toEqual(['a', 'b']);
  });

  it('totalPaginas es 0 cuando no hay elementos', () => {
    const respuesta = crearRespuestaPaginada([], 0, {
      pagina: 1,
      porPagina: 20,
    });

    expect(respuesta.paginacion.total).toBe(0);
    expect(respuesta.paginacion.totalPaginas).toBe(0);
  });
});
