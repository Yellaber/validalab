import { AppConfigService } from '../../config/app-config.service';
import { ServicioDeCifrado } from './cifrado.service';

function crear(): ServicioDeCifrado {
  const config = {
    byok: { claveCifrado: 'a'.repeat(64), validarKey: true },
  } as AppConfigService;
  return new ServicioDeCifrado(config);
}

describe('ServicioDeCifrado', () => {
  it('el texto cifrado difiere del plano y del formato iv:tag:ct', () => {
    const cifrado = crear().cifrar('sk-secreta-123');

    expect(cifrado).not.toContain('sk-secreta-123');
    expect(cifrado.split(':')).toHaveLength(3);
  });

  it('descifrar recupera el texto original (round-trip)', () => {
    const servicio = crear();
    const plano = 'sk-ant-clave-super-secreta';

    expect(servicio.descifrar(servicio.cifrar(plano))).toBe(plano);
  });

  it('dos cifrados del mismo texto difieren (IV aleatorio)', () => {
    const servicio = crear();

    expect(servicio.cifrar('igual')).not.toBe(servicio.cifrar('igual'));
  });

  it('un texto cifrado manipulado falla la verificación del authTag', () => {
    const servicio = crear();
    const [iv, tag, ct] = servicio.cifrar('secreto').split(':');
    const manipulado = [
      iv,
      tag,
      ct.replace(/.$/, (c) => (c === '0' ? '1' : '0')),
    ].join(':');

    expect(() => servicio.descifrar(manipulado)).toThrow();
  });
});
