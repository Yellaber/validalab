import { ConflictoException } from '../../common/errors/dominio.exception';
import { ConfiguracionService } from '../../proveedores/configuracion/configuracion.service';
import { ModeloDeChatFactory } from './modelo-chat.factory';

function crear(credencial: unknown): {
  factory: ModeloDeChatFactory;
  configuracion: { credencialPara: jest.Mock };
} {
  const configuracion = {
    credencialPara: jest.fn().mockResolvedValue(credencial),
  };
  const factory = new ModeloDeChatFactory(
    configuracion as unknown as ConfiguracionService,
  );
  return { factory, configuracion };
}

describe('ModeloDeChatFactory', () => {
  it('construye el modelo del proveedor configurado con su modeloScoring', async () => {
    const { factory } = crear({
      proveedor: 'anthropic',
      modelo: 'claude-haiku-4-5-20251001',
      apiKey: 'sk-test',
    });

    const resultado = await factory.crear('owner-1', 'scoring');

    expect(resultado.proveedor).toBe('anthropic');
    expect(resultado.nombreModelo).toBe('claude-haiku-4-5-20251001');
    expect(resultado.modelo).toBeDefined();
  });

  it('soporta cada proveedor del catálogo detrás del mismo adaptador (RNF-06)', async () => {
    for (const proveedor of ['anthropic', 'openai', 'google'] as const) {
      const { factory } = crear({ proveedor, modelo: 'm', apiKey: 'k' });
      const resultado = await factory.crear('owner-1', 'scoring');
      expect(resultado.proveedor).toBe(proveedor);
    }
  });

  it('sin config BYOK lanza Conflicto (lo captura la capa agéntica → fallida)', async () => {
    const { factory } = crear(null);

    await expect(factory.crear('owner-1', 'scoring')).rejects.toBeInstanceOf(
      ConflictoException,
    );
  });
});
