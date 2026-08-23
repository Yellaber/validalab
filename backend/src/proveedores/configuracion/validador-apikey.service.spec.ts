import { AppConfigService } from '../../config/app-config.service';
import { ValidadorDeApiKey } from './validador-apikey.service';

function crear(validarKey: boolean): ValidadorDeApiKey {
  const config = {
    byok: { claveCifrado: 'a'.repeat(64), validarKey },
  } as AppConfigService;
  return new ValidadorDeApiKey(config);
}

describe('ValidadorDeApiKey (flag BYOK_VALIDAR_KEY=false)', () => {
  it('acepta cualquier key no vacía sin salir a la red', async () => {
    expect(await crear(false).validar('anthropic', 'sk-lo-que-sea')).toBe(
      'valida',
    );
  });

  it('una key vacía es inválida', async () => {
    expect(await crear(false).validar('openai', '   ')).toBe('invalida');
  });
});

describe('ValidadorDeApiKey (validación real, fetch mockeado)', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  it('mapea 200 → valida', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    expect(await crear(true).validar('anthropic', 'k')).toBe('valida');
  });

  it('mapea 401 → invalida', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

    expect(await crear(true).validar('openai', 'k')).toBe('invalida');
  });

  it('mapea un error de red → no_disponible', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNRESET'));

    expect(await crear(true).validar('google', 'k')).toBe('no_disponible');
  });

  it('mapea 500 → no_disponible', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    expect(await crear(true).validar('anthropic', 'k')).toBe('no_disponible');
  });
});
