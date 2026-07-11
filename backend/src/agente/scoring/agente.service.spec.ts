import { Repository } from 'typeorm';
import { ConflictoException } from '../../common/errors/dominio.exception';
import { AppConfigService } from '../../config/app-config.service';
import { Entrevista } from '../../entrevistas/entrevista/entrevista.entity';
import { ScoreEntrevista } from '../../entrevistas/entrevista/entrevista.types';
import { HipotesisService } from '../../ideas/hipotesis/hipotesis.service';
import { UmbralesService } from '../../ideas/umbral/umbrales.service';
import { AlertasService } from '../../kpis/alertas/alertas.service';
import { EjecucionAgente } from '../ejecucion/ejecucion-agente.entity';
import { ModeloDeChatFactory } from '../proveedor/modelo-chat.factory';
import { AgenteService } from './agente.service';
import { calcularHashScoring } from './hash-scoring';

const OWNER = 'owner-1';
const VERSION = 'v1';

/** Forma tipada de una llamada a `entrevistas.update(where, set)`. */
type CallUpdate = [
  { id: string; estadoScoring?: string },
  { estadoScoring?: string; score?: ScoreEntrevista },
];

/** Llamadas a `update` ya tipadas (evita `any` de `mock.calls`). */
function updatesDe(entrevistas: { update: jest.Mock }): CallUpdate[] {
  const calls: unknown = entrevistas.update.mock.calls;
  return calls as CallUpdate[];
}

function entrevistaDe(parcial: Partial<Entrevista> = {}): Entrevista {
  return {
    id: 'e1',
    ideaId: 'idea-1',
    contactoId: 'c1',
    guionId: 'g1',
    respuestas: [{ preguntaId: 'p1', texto: 'me duele mucho este problema' }],
    citas: [],
    estadoScoring: 'pendiente',
    score: null,
    ajuste: null,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
    ...parcial,
  } as Entrevista;
}

function crear(modo: 'real' | 'fake', factoryCrear?: jest.Mock) {
  const entrevistas = {
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    find: jest.fn().mockResolvedValue([]),
  };
  const ejecuciones = {
    create: jest.fn((x: Partial<EjecucionAgente>) => x),
    save: jest.fn((x: EjecucionAgente) => Promise.resolve(x)),
  };
  const factory = {
    crear:
      factoryCrear ??
      jest.fn().mockResolvedValue({
        modelo: {},
        proveedor: 'anthropic',
        nombreModelo: 'claude',
      }),
  };
  const config = {
    agente: {
      modo,
      versionRubrica: VERSION,
      maxIteraciones: 6,
      maxReintentos: 2,
      timeoutMs: 30000,
    },
  };
  const alertas = { evaluarIdea: jest.fn().mockResolvedValue(undefined) };
  const servicio = new AgenteService(
    entrevistas as unknown as Repository<Entrevista>,
    ejecuciones as unknown as Repository<EjecucionAgente>,
    factory as unknown as ModeloDeChatFactory,
    {} as HipotesisService,
    {} as UmbralesService,
    config as unknown as AppConfigService,
    alertas as unknown as AlertasService,
  );
  return { servicio, entrevistas, ejecuciones, factory, alertas };
}

describe('AgenteService.solicitarScoring (modo fake)', () => {
  it('puntúa una entrevista y persiste el score y la traza', async () => {
    const { servicio, entrevistas, ejecuciones, alertas } = crear('fake');
    const entrevista = entrevistaDe();

    await servicio.solicitarScoring(OWNER, entrevista);

    // tras puntuar, dispara la evaluación de alertas de la idea
    expect(alertas.evaluarIdea).toHaveBeenCalledWith(OWNER, entrevista.ideaId);

    const updates = updatesDe(entrevistas);
    // primera actualización: procesando
    expect(updates[0]).toEqual([{ id: 'e1' }, { estadoScoring: 'procesando' }]);
    // segunda: puntuada con el score, condicionada a seguir en procesando
    const [donde, set] = updates[1];
    expect(donde).toEqual({ id: 'e1', estadoScoring: 'procesando' });
    expect(set.score).toEqual(
      expect.objectContaining({
        proveedor: 'fake',
        rubricaVersion: VERSION,
        hashEntrada: calcularHashScoring(entrevista.respuestas, VERSION),
      }),
    );
    expect(typeof set.score?.senalesEstructuradas?.dolorConfirmado).toBe(
      'boolean',
    );
    // traza exitosa
    expect(ejecuciones.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'exitosa',
        modo: 'fake',
        ownerId: OWNER,
      }),
    );
  });

  it('es idempotente: no re-puntúa si ya está puntuada con el mismo hash', async () => {
    const { servicio, entrevistas, ejecuciones } = crear('fake');
    const respuestas = [{ preguntaId: 'p1', texto: 'igual' }];
    const entrevista = entrevistaDe({
      estadoScoring: 'puntuada',
      respuestas,
      score: {
        score: 7,
        justificacion: 'previo',
        senales: [],
        confianza: 80,
        hashEntrada: calcularHashScoring(respuestas, VERSION),
      },
    });

    await servicio.solicitarScoring(OWNER, entrevista);

    expect(entrevistas.update).not.toHaveBeenCalled();
    expect(ejecuciones.save).not.toHaveBeenCalled();
  });

  it('produce un score determinista para las mismas respuestas', async () => {
    const salidas: Array<number | undefined> = [];
    for (let i = 0; i < 2; i++) {
      const { servicio, entrevistas } = crear('fake');
      await servicio.solicitarScoring(OWNER, entrevistaDe());
      salidas.push(updatesDe(entrevistas)[1][1].score?.score);
    }
    expect(salidas[0]).toBe(salidas[1]);
    expect(salidas[0]).toBeDefined();
  });
});

describe('AgenteService.solicitarScoring (fallos)', () => {
  it('sin config BYOK (modo real) deja la entrevista fallida con traza', async () => {
    const factoryCrear = jest
      .fn()
      .mockRejectedValue(new Error('No hay configuración BYOK'));
    const { servicio, entrevistas, ejecuciones } = crear('real', factoryCrear);

    await servicio.solicitarScoring(OWNER, entrevistaDe());

    expect(ejecuciones.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'fallida', ownerId: OWNER }),
    );
    const fallida = updatesDe(entrevistas).find(
      ([, set]) => set.estadoScoring === 'fallida',
    );
    expect(fallida).toBeDefined();
    expect(fallida?.[0]).toEqual({ id: 'e1', estadoScoring: 'procesando' });
  });

  it('nunca rechaza (fire-and-forget), aun si persistir la traza falla', async () => {
    const { servicio, ejecuciones } = crear('real', jest.fn());
    ejecuciones.save.mockRejectedValue(new Error('db caída'));

    await expect(
      servicio.solicitarScoring(OWNER, entrevistaDe()),
    ).resolves.toBeUndefined();
  });
});

describe('AgenteService.reevaluar (síncrono, E8b)', () => {
  it('re-puntúa una entrevista con hash distinto y devuelve sus tokens', async () => {
    const { servicio, alertas } = crear('fake');

    const resultado = await servicio.reevaluar(OWNER, entrevistaDe());

    expect(resultado.reevaluada).toBe(true);
    expect(typeof resultado.tokensEntrada).toBe('number');
    // tras re-puntuar, dispara la evaluación de alertas
    expect(alertas.evaluarIdea).toHaveBeenCalledWith(OWNER, 'idea-1');
  });

  it('omite (reevaluada:false) si el hash coincide con el score vigente', async () => {
    const { servicio, entrevistas } = crear('fake');
    const respuestas = [{ preguntaId: 'p1', texto: 'igual' }];
    const entrevista = entrevistaDe({
      estadoScoring: 'puntuada',
      respuestas,
      score: {
        score: 7,
        justificacion: 'previo',
        senales: [],
        confianza: 80,
        hashEntrada: calcularHashScoring(respuestas, VERSION),
      },
    });

    const resultado = await servicio.reevaluar(OWNER, entrevista);

    expect(resultado.reevaluada).toBe(false);
    expect(entrevistas.update).not.toHaveBeenCalled();
  });

  it('propaga el error (sin BYOK) sin dejar la entrevista en procesando', async () => {
    const factoryCrear = jest
      .fn()
      .mockRejectedValue(new ConflictoException('sin BYOK'));
    const { servicio, entrevistas } = crear('real', factoryCrear);

    await expect(
      servicio.reevaluar(OWNER, entrevistaDe()),
    ).rejects.toBeInstanceOf(ConflictoException);
    expect(entrevistas.update).not.toHaveBeenCalled();
  });
});
