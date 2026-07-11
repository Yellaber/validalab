import { Repository } from 'typeorm';
import { EjecucionAgente } from '../../agente/ejecucion/ejecucion-agente.entity';
import { AgenteService } from '../../agente/scoring/agente.service';
import {
  AccesoDenegadoException,
  ConflictoException,
} from '../../common/errors/dominio.exception';
import { AppConfigService } from '../../config/app-config.service';
import { IdeasService } from '../../ideas/idea/ideas.service';
import { ConfiguracionService } from '../../proveedores/configuracion/configuracion.service';
import { PrecioModelo } from '../../proveedores/precios/precio-modelo.entity';
import { PreciosService } from '../../proveedores/precios/precios.service';
import { Entrevista } from '../entrevista/entrevista.entity';
import { ReevaluacionService } from './reevaluacion.service';

const OWNER = 'owner-1';
const IDEA = 'idea-1';

/** Entrevista puntuada con hash DESACTUALIZADO (afectada por cambio de rúbrica). */
function afectada(id: string): Entrevista {
  return {
    id,
    ideaId: IDEA,
    respuestas: [{ preguntaId: 'p1', texto: 'r' }],
    estadoScoring: 'puntuada',
    score: {
      score: 5,
      justificacion: '',
      senales: [],
      confianza: 50,
      hashEntrada: 'viejo',
    },
  } as Entrevista;
}

const MAPA = new Map<string, PrecioModelo>([
  [
    'anthropic|claude-opus-4-8',
    { precioEntradaPorMillon: 5, precioSalidaPorMillon: 25 } as PrecioModelo,
  ],
]);

function crear(
  entrevistas: Entrevista[],
  historico: Partial<EjecucionAgente>[] = [
    { tokensEntrada: 1_000_000, tokensSalida: 1_000_000 },
  ],
  reevaluarImpl?: jest.Mock,
) {
  const entRepo = { find: jest.fn().mockResolvedValue(entrevistas) };
  const ejecRepo = { find: jest.fn().mockResolvedValue(historico) };
  const agente = {
    reevaluar:
      reevaluarImpl ??
      jest.fn().mockResolvedValue({
        reevaluada: true,
        tokensEntrada: 1_000_000,
        tokensSalida: 1_000_000,
      }),
  };
  const ideas = {
    asegurarPropia: jest.fn().mockResolvedValue({ id: IDEA }),
  };
  const configuracion = {
    credencialPara: jest.fn().mockResolvedValue({
      proveedor: 'anthropic',
      modelo: 'claude-opus-4-8',
      apiKey: 'k',
    }),
  };
  const precios = { mapaVigente: jest.fn().mockResolvedValue(MAPA) };
  const config = { agente: { versionRubrica: 'v2' } };
  const servicio = new ReevaluacionService(
    entRepo as unknown as Repository<Entrevista>,
    ejecRepo as unknown as Repository<EjecucionAgente>,
    agente as unknown as AgenteService,
    ideas as unknown as IdeasService,
    configuracion as unknown as ConfiguracionService,
    precios as unknown as PreciosService,
    config as unknown as AppConfigService,
  );
  return { servicio, agente, ideas, configuracion };
}

describe('ReevaluacionService.estimar', () => {
  it('cuenta las afectadas y estima el costo sin ejecutar', async () => {
    const { servicio, agente } = crear([afectada('e1'), afectada('e2')]);

    const est = await servicio.estimar(OWNER, IDEA);

    expect(est.entrevistasAfectadas).toBe(2);
    expect(est.modeloScoring).toBe('claude-opus-4-8');
    // promedio 1M/1M × 2 afectadas = 2M/2M → (2×5) + (2×25) = 60
    expect(est.tokensEntradaEstimados).toBe(2_000_000);
    expect(est.costoEstimado).toBeCloseTo(60);
    expect(est.esEstimado).toBe(true);
    expect(agente.reevaluar).not.toHaveBeenCalled(); // no muta
  });

  it('sin BYOK → modeloScoring null y costo 0', async () => {
    const { servicio, configuracion } = crear([afectada('e1')]);
    configuracion.credencialPara.mockResolvedValue(null);

    const est = await servicio.estimar(OWNER, IDEA);

    expect(est.modeloScoring).toBeNull();
    expect(est.costoEstimado).toBe(0);
  });

  it('propaga AccesoDenegado si la idea es ajena', async () => {
    const { servicio, ideas } = crear([]);
    ideas.asegurarPropia.mockRejectedValue(new AccesoDenegadoException());

    await expect(servicio.estimar(OWNER, IDEA)).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
  });
});

describe('ReevaluacionService.ejecutar', () => {
  it('re-evalúa las afectadas y agrega tokens/costo', async () => {
    const { servicio } = crear([afectada('e1'), afectada('e2')]);

    const res = await servicio.ejecutar(OWNER, IDEA);

    expect(res.entrevistasReevaluadas).toBe(2);
    expect(res.entrevistasOmitidas).toBe(0);
    expect(res.tokensEntrada).toBe(2_000_000);
    expect(res.costoEstimado).toBeCloseTo(60);
  });

  it('omite las que el scoring reporta sin cambios', async () => {
    const reevaluar = jest
      .fn()
      .mockResolvedValueOnce({
        reevaluada: true,
        tokensEntrada: 100,
        tokensSalida: 50,
      })
      .mockResolvedValueOnce({
        reevaluada: false,
        tokensEntrada: 0,
        tokensSalida: 0,
      });
    const { servicio } = crear(
      [afectada('e1'), afectada('e2')],
      undefined,
      reevaluar,
    );

    const res = await servicio.ejecutar(OWNER, IDEA, ['e1', 'e2']);

    expect(res.entrevistasReevaluadas).toBe(1);
    expect(res.entrevistasOmitidas).toBe(1);
  });

  it('sin BYOK → propaga Conflicto (409)', async () => {
    const reevaluar = jest
      .fn()
      .mockRejectedValue(new ConflictoException('sin BYOK'));
    const { servicio } = crear([afectada('e1')], undefined, reevaluar);

    await expect(servicio.ejecutar(OWNER, IDEA)).rejects.toBeInstanceOf(
      ConflictoException,
    );
  });
});
