import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  const entornoValido = {
    NODE_ENV: 'test',
    DB_HOST: 'localhost',
    DB_USERNAME: 'validalab',
    DB_PASSWORD: 'secreto',
    DB_DATABASE: 'validalab',
    JWT_ACCESS_SECRET: 'un-secreto-de-prueba',
    BYOK_CLAVE_CIFRADO: 'a'.repeat(64),
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

  describe('BOOTSTRAP_TOKEN', () => {
    it('arranca sin la variable: un sistema ya inicializado no la necesita', () => {
      const env = validateEnv(entornoValido);

      expect(env.BOOTSTRAP_TOKEN).toBeUndefined();
    });

    it('trata la cadena vacía como «sin configurar» en vez de abortar', () => {
      const env = validateEnv({ ...entornoValido, BOOTSTRAP_TOKEN: '' });

      expect(env.BOOTSTRAP_TOKEN).toBeUndefined();
    });

    it('acepta un secreto de al menos 32 caracteres', () => {
      const secreto = 'b'.repeat(64);
      const env = validateEnv({ ...entornoValido, BOOTSTRAP_TOKEN: secreto });

      expect(env.BOOTSTRAP_TOKEN).toBe(secreto);
    });

    it('rechaza un secreto demasiado corto para que no pase inadvertido', () => {
      expect(() =>
        validateEnv({ ...entornoValido, BOOTSTRAP_TOKEN: 'corto' }),
      ).toThrow(/BOOTSTRAP_TOKEN/);
    });
  });

  describe('DB_SSL', () => {
    it('queda desactivado por defecto: el PostgreSQL local no habla TLS', () => {
      expect(validateEnv(entornoValido).DB_SSL).toBe(false);
    });

    it('transforma "true" a booleano', () => {
      expect(validateEnv({ ...entornoValido, DB_SSL: 'true' }).DB_SSL).toBe(
        true,
      );
    });
  });

  describe('COOKIE_SAMESITE', () => {
    it('vale strict por defecto', () => {
      expect(validateEnv(entornoValido).COOKIE_SAMESITE).toBe('strict');
    });

    it('acepta none cuando la cookie es Secure', () => {
      const env = validateEnv({
        ...entornoValido,
        COOKIE_SAMESITE: 'none',
        COOKIE_SECURE: 'true',
      });

      expect(env.COOKIE_SAMESITE).toBe('none');
      expect(env.COOKIE_SECURE).toBe(true);
    });

    it('rechaza un valor fuera del conjunto permitido', () => {
      expect(() =>
        validateEnv({ ...entornoValido, COOKIE_SAMESITE: 'Strict' }),
      ).toThrow(/COOKIE_SAMESITE/);
    });

    // Sin esta comprobación el fallo no aparece al arrancar, sino como una
    // sesión que se cae sola cuando expira el accessToken: el navegador
    // descarta en silencio una cookie `SameSite=None` que no sea `Secure`.
    it('aborta si se combina none con COOKIE_SECURE=false, nombrando ambas', () => {
      const incoherente = {
        ...entornoValido,
        COOKIE_SAMESITE: 'none',
        COOKIE_SECURE: 'false',
      };

      expect(() => validateEnv(incoherente)).toThrow(
        /Configuración de entorno inválida/,
      );
      expect(() => validateEnv(incoherente)).toThrow(/COOKIE_SAMESITE/);
      expect(() => validateEnv(incoherente)).toThrow(/COOKIE_SECURE/);
    });

    it('admite strict con COOKIE_SECURE=false: es el desarrollo local sobre http', () => {
      const env = validateEnv({
        ...entornoValido,
        COOKIE_SAMESITE: 'strict',
        COOKIE_SECURE: 'false',
      });

      expect(env.COOKIE_SAMESITE).toBe('strict');
      expect(env.COOKIE_SECURE).toBe(false);
    });
  });
});
