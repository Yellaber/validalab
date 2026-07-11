import { Repository } from 'typeorm';
import { AccesoDenegadoException } from '../../common/errors/dominio.exception';
import { EjecucionAgente } from '../../agente/ejecucion/ejecucion-agente.entity';
import { Idea } from '../../ideas/idea/idea.entity';
import { IdeasService } from '../../ideas/idea/ideas.service';
import { PrecioModelo } from '../precios/precio-modelo.entity';
import { PreciosService } from '../precios/precios.service';
import { CostoService } from './costo.service';

const OWNER = 'owner-1';
const IDEA = 'idea-1';

function ejec(parcial: Partial<EjecucionAgente>): EjecucionAgente {
  return {
    id: 'e',
    ideaId: IDEA,
    entrevistaId: null,
    ownerId: OWNER,
    tarea: 'scoring',
    modo: 'real',
    proveedor: 'anthropic',
    modelo: 'claude-opus-4-8',
    estado: 'exitosa',
    iteraciones: 1,
    tokensEntrada: null,
    tokensSalida: null,
    salida: null,
    error: null,
    fechaCreacion: new Date(),
    ...parcial,
  };
}

/** Precio opus: entrada 5 / salida 25 por millón. */
const MAPA = new Map<string, PrecioModelo>([
  [
    'anthropic|claude-opus-4-8',
    {
      precioEntradaPorMillon: 5,
      precioSalidaPorMillon: 25,
    } as PrecioModelo,
  ],
]);

function crear(ejecuciones: EjecucionAgente[], ideas: Partial<Idea>[] = []) {
  const ejecRepo = { find: jest.fn().mockResolvedValue(ejecuciones) };
  const ideaRepo = { find: jest.fn().mockResolvedValue(ideas) };
  const ideasService = {
    asegurarPropia: jest.fn().mockResolvedValue({ id: IDEA }),
  };
  const precios = { mapaVigente: jest.fn().mockResolvedValue(MAPA) };
  const servicio = new CostoService(
    ejecRepo as unknown as Repository<EjecucionAgente>,
    ideaRepo as unknown as Repository<Idea>,
    ideasService as unknown as IdeasService,
    precios as unknown as PreciosService,
  );
  return { servicio, ejecRepo, ideasService };
}

describe('CostoService.costoIdea', () => {
  it('agrega tokens × precios con desglose por tarea', async () => {
    const { servicio } = crear([
      ejec({
        tarea: 'scoring',
        tokensEntrada: 1_000_000,
        tokensSalida: 1_000_000,
      }), // 5 + 25 = 30
      ejec({ tarea: 'veredicto', tokensEntrada: 2_000_000, tokensSalida: 0 }), // 10
    ]);

    const costo = await servicio.costoIdea(OWNER, IDEA);

    expect(costo.costoEstimadoTotal).toBeCloseTo(40);
    const scoring = costo.desglosePorTarea.find((d) => d.tarea === 'scoring');
    const veredicto = costo.desglosePorTarea.find(
      (d) => d.tarea === 'veredicto',
    );
    expect(scoring?.costoEstimado).toBeCloseTo(30);
    expect(scoring?.llamadas).toBe(1);
    expect(veredicto?.costoEstimado).toBeCloseTo(10);
    expect(costo.proveedor).toBe('anthropic');
    expect(costo.esEstimado).toBe(true);
    expect(costo.urlFacturacion).toContain('anthropic');
  });

  it('idea sin consumo → costo total 0', async () => {
    const { servicio } = crear([]);

    const costo = await servicio.costoIdea(OWNER, IDEA);

    expect(costo.costoEstimadoTotal).toBe(0);
    expect(costo.llamadas).toBe(0);
    expect(costo.proveedor).toBeNull();
    expect(costo.urlFacturacion).toBeNull();
  });

  it('ejecución sin precio catalogado → costo 0 pero cuenta llamada y tokens', async () => {
    const { servicio } = crear([
      ejec({
        modelo: 'modelo-desconocido',
        tokensEntrada: 1_000_000,
        tokensSalida: 1_000_000,
      }),
    ]);

    const costo = await servicio.costoIdea(OWNER, IDEA);

    expect(costo.costoEstimadoTotal).toBe(0);
    expect(costo.llamadas).toBe(1);
    expect(costo.tokensEntrada).toBe(1_000_000);
  });

  it('modo fake (tokens null) → costo 0 con llamadas contadas', async () => {
    const { servicio } = crear([ejec({ proveedor: 'fake', modelo: 'fake' })]);

    const costo = await servicio.costoIdea(OWNER, IDEA);

    expect(costo.costoEstimadoTotal).toBe(0);
    expect(costo.llamadas).toBe(1);
  });

  it('propaga AccesoDenegado si la idea es ajena', async () => {
    const { servicio, ideasService } = crear([]);
    ideasService.asegurarPropia.mockRejectedValue(
      new AccesoDenegadoException(),
    );

    await expect(servicio.costoIdea(OWNER, IDEA)).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
  });
});

describe('CostoService.costoUsuario', () => {
  it('agrega por idea con títulos', async () => {
    const { servicio } = crear(
      [
        ejec({ ideaId: 'i1', tokensEntrada: 1_000_000, tokensSalida: 0 }), // 5
        ejec({ ideaId: 'i2', tokensEntrada: 0, tokensSalida: 1_000_000 }), // 25
      ],
      [
        { id: 'i1', titulo: 'Idea uno' },
        { id: 'i2', titulo: 'Idea dos' },
      ],
    );

    const costo = await servicio.costoUsuario(OWNER);

    expect(costo.costoEstimadoTotal).toBeCloseTo(30);
    expect(costo.costoPorIdea).toHaveLength(2);
    // ordenado por costo desc: i2 (25) antes que i1 (5)
    expect(costo.costoPorIdea[0]).toEqual(
      expect.objectContaining({ ideaId: 'i2', titulo: 'Idea dos' }),
    );
    expect(costo.esEstimado).toBe(true);
  });
});
