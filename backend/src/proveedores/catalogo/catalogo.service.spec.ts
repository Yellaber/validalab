import { Repository } from 'typeorm';
import { ModeloIA } from './modelo-ia.entity';
import { CatalogoService } from './catalogo.service';

function modelo(parcial: Partial<ModeloIA>): ModeloIA {
  return {
    id: 'm',
    proveedor: 'anthropic',
    modeloId: 'x',
    nombre: 'X',
    descripcion: null,
    orden: 1,
    ...parcial,
  };
}

function crear(modelos: ModeloIA[]): CatalogoService {
  const repo = {
    find: jest.fn().mockResolvedValue(modelos),
  };
  return new CatalogoService(repo as unknown as Repository<ModeloIA>);
}

describe('CatalogoService.listar', () => {
  it('incluye los tres proveedores soportados', async () => {
    const servicio = crear([]);

    const catalogo = await servicio.listar();

    expect(catalogo.map((p) => p.id)).toEqual([
      'anthropic',
      'openai',
      'google',
    ]);
  });

  it('agrupa los modelos por proveedor y mapea id/nombre', async () => {
    const servicio = crear([
      modelo({
        proveedor: 'anthropic',
        modeloId: 'claude-opus-4-8',
        nombre: 'Opus',
      }),
      modelo({ proveedor: 'openai', modeloId: 'gpt-4o', nombre: 'GPT-4o' }),
    ]);

    const catalogo = await servicio.listar();

    const anthropic = catalogo.find((p) => p.id === 'anthropic')!;
    expect(anthropic.modelos).toEqual([
      { id: 'claude-opus-4-8', nombre: 'Opus', descripcion: undefined },
    ]);
    expect(catalogo.find((p) => p.id === 'openai')!.modelos[0].id).toBe(
      'gpt-4o',
    );
  });

  it('un proveedor sin modelos aparece con lista vacía', async () => {
    const servicio = crear([
      modelo({ proveedor: 'anthropic', modeloId: 'claude-opus-4-8' }),
    ]);

    const catalogo = await servicio.listar();

    expect(catalogo.find((p) => p.id === 'google')!.modelos).toEqual([]);
  });
});
