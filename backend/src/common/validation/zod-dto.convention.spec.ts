import { ArgumentMetadata } from '@nestjs/common';
import {
  ZodValidationPipe,
  ZodValidationException,
  createZodDto,
} from 'nestjs-zod';
import { z, ZodError } from 'zod';

/**
 * Ejemplo de referencia de la CONVENCIÓN de DTOs del backend: se declara un
 * esquema Zod y se envuelve con `createZodDto`. El `ZodValidationPipe` global
 * (registrado en `AppModule`) valida automáticamente todo DTO de esta forma.
 * El sobre `VALIDACION_FALLIDA` con `detalles` lo produce el filtro global de
 * excepciones (grupo 5) a partir de la `ZodValidationException` que aquí se
 * verifica.
 */
class CrearEjemploDto extends createZodDto(
  z.object({
    nombre: z.string().min(1),
    edad: z.coerce.number().int().nonnegative(),
  }),
) {}

const metadata: ArgumentMetadata = {
  type: 'body',
  metatype: CrearEjemploDto,
  data: undefined,
};

describe('Convención de DTOs: createZodDto + ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe();

  it('acepta y normaliza un payload válido (incluida la coerción)', () => {
    const result = pipe.transform({ nombre: 'Ana', edad: '30' }, metadata) as {
      nombre: string;
      edad: number;
    };

    expect(result).toEqual({ nombre: 'Ana', edad: 30 });
  });

  it('rechaza un payload inválido con issues campo a campo', () => {
    let capturado: unknown;
    try {
      pipe.transform({ nombre: '', edad: -1 }, metadata);
    } catch (e) {
      capturado = e;
    }

    expect(capturado).toBeInstanceOf(ZodValidationException);

    const zodError = (
      capturado as ZodValidationException
    ).getZodError() as ZodError;
    const campos = zodError.issues.map((issue) =>
      issue.path.map(String).join('.'),
    );
    expect(campos).toEqual(expect.arrayContaining(['nombre', 'edad']));
  });
});
