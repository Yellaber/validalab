import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  const entornoValido = {
    NODE_ENV: 'test',
    DB_HOST: 'localhost',
    DB_USERNAME: 'validalab',
    DB_PASSWORD: 'secreto',
    DB_DATABASE: 'validalab',
    JWT_ACCESS_SECRET: 'un-secreto-de-prueba',
  };

  it('valida un entorno completo y aplica coerción y valores por defecto', () => {
    const env = validateEnv(entornoValido);

    expect(env.PORT).toBe(3000); // por defecto, ya numérico
    expect(env.DB_PORT).toBe(5432); // por defecto
    expect(env.DB_SYNCHRONIZE).toBe(false); // por defecto, ya booleano
    expect(env.JWT_ACCESS_TTL).toBe('15m'); // por defecto
    expect(env.NODE_ENV).toBe('test');
  });

  it('coerciona PORT y DB_PORT desde string a number', () => {
    const env = validateEnv({
      ...entornoValido,
      PORT: '8080',
      DB_PORT: '6543',
    });

    expect(env.PORT).toBe(8080);
    expect(env.DB_PORT).toBe(6543);
  });

  it('transforma DB_SYNCHRONIZE="true" a booleano', () => {
    const env = validateEnv({ ...entornoValido, DB_SYNCHRONIZE: 'true' });

    expect(env.DB_SYNCHRONIZE).toBe(true);
  });

  it('aborta con un mensaje claro cuando falta una variable obligatoria', () => {
    const sinDbHost: Record<string, unknown> = { ...entornoValido };
    delete sinDbHost.DB_HOST;

    expect(() => validateEnv(sinDbHost)).toThrow(
      /Configuración de entorno inválida/,
    );
    expect(() => validateEnv(sinDbHost)).toThrow(/DB_HOST/);
  });

  it('rechaza un PORT no numérico', () => {
    expect(() =>
      validateEnv({ ...entornoValido, PORT: 'no-es-numero' }),
    ).toThrow(/PORT/);
  });

  it('rechaza un NODE_ENV fuera del conjunto permitido', () => {
    expect(() =>
      validateEnv({ ...entornoValido, NODE_ENV: 'staging' }),
    ).toThrow(/NODE_ENV/);
  });
});
