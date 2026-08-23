import { Repository } from 'typeorm';
import {
  AccesoDenegadoException,
  ConflictoException,
  EntrevistaSinVinculoException,
  RecursoNoEncontradoException,
} from '../../common/errors/dominio.exception';
import { AgenteService } from '../../agente/scoring/agente.service';
import { ContactosService } from '../../contactos/contactos.service';
import { IdeasService } from '../../ideas/idea/ideas.service';
import { GuionesService } from '../guion/guiones.service';
import { Entrevista } from './entrevista.entity';
import { EntrevistasService } from './entrevistas.service';
import { CrearEntrevistaDto } from './entrevistas.dto';

type RepoMock = {
  findAndCount: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
};

const OWNER = 'owner-1';
const IDEA = 'idea-1';
const CONTACTO = 'contacto-1';
const GUION = 'guion-1';

function crear(): {
  servicio: EntrevistasService;
  repo: RepoMock;
  ideas: { asegurarPropia: jest.Mock };
  contactos: {
    asegurarVinculoConIdea: jest.Mock;
    marcarEntrevistado: jest.Mock;
  };
  guiones: { asegurarVinculo: jest.Mock };
  agente: { solicitarScoring: jest.Mock };
} {
  const repo: RepoMock = {
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((x: Partial<Entrevista>) => x),
    save: jest.fn((x: Entrevista) =>
      Promise.resolve({
        ...x,
        id: x.id ?? 'e1',
        fechaCreacion: x.fechaCreacion ?? new Date('2026-01-01T00:00:00.000Z'),
        fechaActualizacion:
          x.fechaActualizacion ?? new Date('2026-01-02T00:00:00.000Z'),
      }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const ideas = { asegurarPropia: jest.fn().mockResolvedValue({ id: IDEA }) };
  const contactos = {
    asegurarVinculoConIdea: jest
      .fn()
      .mockResolvedValue({ id: CONTACTO, ideaId: IDEA, estado: 'agendado' }),
    marcarEntrevistado: jest.fn().mockResolvedValue(undefined),
  };
  const guiones = { asegurarVinculo: jest.fn().mockResolvedValue(undefined) };
  const agente = { solicitarScoring: jest.fn().mockResolvedValue(undefined) };
  const servicio = new EntrevistasService(
    repo as unknown as Repository<Entrevista>,
    ideas as unknown as IdeasService,
    contactos as unknown as ContactosService,
    guiones as unknown as GuionesService,
    agente as unknown as AgenteService,
  );
  return { servicio, repo, ideas, contactos, guiones, agente };
}

function entrevistaDe(parcial: Partial<Entrevista> = {}): Entrevista {
  return {
    id: 'e1',
    ideaId: IDEA,
    contactoId: CONTACTO,
    guionId: GUION,
    respuestas: [{ preguntaId: 'p1', texto: 'r1' }],
    citas: [],
    estadoScoring: 'pendiente',
    score: null,
    ajuste: null,
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-01-02T00:00:00.000Z'),
    ...parcial,
  } as Entrevista;
}

const datos: CrearEntrevistaDto = {
  contactoId: CONTACTO,
  guionId: GUION,
  respuestas: [{ preguntaId: 'p1', texto: 'r1' }],
};

describe('EntrevistasService.crear', () => {
  it('crea en pendiente y mueve el contacto a entrevistado', async () => {
    const { servicio, repo, contactos } = crear();

    const dto = await servicio.crear(OWNER, IDEA, datos);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ideaId: IDEA,
        contactoId: CONTACTO,
        guionId: GUION,
        estadoScoring: 'pendiente',
        score: null,
      }),
    );
    expect(contactos.marcarEntrevistado).toHaveBeenCalled();
    expect(dto.estadoScoring).toBe('pendiente');
    expect(dto.score).toBeNull();
  });

  it('dispara el scoring del agente al crear', async () => {
    const { servicio, agente } = crear();

    await servicio.crear(OWNER, IDEA, datos);

    expect(agente.solicitarScoring).toHaveBeenCalledWith(
      OWNER,
      expect.objectContaining({ ideaId: IDEA }),
    );
  });

  it('propaga ENTREVISTA_SIN_VINCULO si el contacto no es de la idea', async () => {
    const { servicio, contactos, repo } = crear();
    contactos.asegurarVinculoConIdea.mockRejectedValue(
      new EntrevistaSinVinculoException(),
    );

    await expect(servicio.crear(OWNER, IDEA, datos)).rejects.toBeInstanceOf(
      EntrevistaSinVinculoException,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('propaga ENTREVISTA_SIN_VINCULO si el guión no es propio', async () => {
    const { servicio, guiones } = crear();
    guiones.asegurarVinculo.mockRejectedValue(
      new EntrevistaSinVinculoException(),
    );

    await expect(servicio.crear(OWNER, IDEA, datos)).rejects.toBeInstanceOf(
      EntrevistaSinVinculoException,
    );
  });

  it('un contacto ya entrevistado/descartado → Conflicto (409)', async () => {
    const { servicio, contactos, repo } = crear();
    contactos.asegurarVinculoConIdea.mockResolvedValue({
      id: CONTACTO,
      estado: 'entrevistado',
    });

    await expect(servicio.crear(OWNER, IDEA, datos)).rejects.toBeInstanceOf(
      ConflictoException,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('idea ajena → AccesoDenegado (403)', async () => {
    const { servicio, ideas } = crear();
    ideas.asegurarPropia.mockRejectedValue(new AccesoDenegadoException());

    await expect(servicio.crear(OWNER, IDEA, datos)).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
  });
});

describe('EntrevistasService.listar', () => {
  it('aplica los filtros contactoId y estadoScoring', async () => {
    const { servicio, repo } = crear();

    await servicio.listar(OWNER, IDEA, {
      pagina: 1,
      porPagina: 20,
      contactoId: CONTACTO,
      estadoScoring: 'pendiente',
    });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ideaId: IDEA,
          contactoId: CONTACTO,
          estadoScoring: 'pendiente',
        },
      }),
    );
  });
});

describe('EntrevistasService.actualizar', () => {
  it('cambiar respuestas reinicia el estadoScoring a pendiente y limpia score', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(
      entrevistaDe({ estadoScoring: 'puntuada', score: { score: 8 } as never }),
    );

    const dto = await servicio.actualizar(OWNER, IDEA, 'e1', {
      respuestas: [{ preguntaId: 'p2', texto: 'nueva' }],
    });

    expect(dto.estadoScoring).toBe('pendiente');
    expect(dto.score).toBeNull();
  });

  it('cambiar respuestas re-dispara el scoring; cambiar solo citas no', async () => {
    const { servicio, repo, agente } = crear();
    repo.findOne.mockResolvedValue(entrevistaDe({ estadoScoring: 'puntuada' }));

    await servicio.actualizar(OWNER, IDEA, 'e1', {
      respuestas: [{ preguntaId: 'p2', texto: 'nueva' }],
    });
    expect(agente.solicitarScoring).toHaveBeenCalledTimes(1);

    agente.solicitarScoring.mockClear();
    await servicio.actualizar(OWNER, IDEA, 'e1', {
      citas: [{ texto: 'una cita' }],
    });
    expect(agente.solicitarScoring).not.toHaveBeenCalled();
  });

  it('cambiar solo citas no afecta el estadoScoring', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(entrevistaDe({ estadoScoring: 'puntuada' }));

    const dto = await servicio.actualizar(OWNER, IDEA, 'e1', {
      citas: [{ texto: 'una cita' }],
    });

    expect(dto.estadoScoring).toBe('puntuada');
    expect(dto.citas[0].id).toBeDefined();
  });

  it('una entrevista inexistente → RecursoNoEncontrado (404)', async () => {
    const { servicio } = crear();

    await expect(
      servicio.actualizar(OWNER, IDEA, 'e1', { citas: [] }),
    ).rejects.toBeInstanceOf(RecursoNoEncontradoException);
  });
});

describe('EntrevistasService.ajustarScore', () => {
  it('registra el ajuste conservando el bloque score', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(entrevistaDe());

    const dto = await servicio.ajustarScore(OWNER, IDEA, 'e1', {
      scoreAjustado: 5,
      nota: 'muy optimista',
    });

    expect(dto.ajuste?.scoreAjustado).toBe(5);
    expect(dto.ajuste?.nota).toBe('muy optimista');
    expect(dto.score).toBeNull();
  });
});

describe('EntrevistasService.puntuar', () => {
  it('re-dispara el scoring y devuelve el estadoScoring actualizado', async () => {
    const { servicio, repo, agente } = crear();
    repo.findOne
      .mockResolvedValueOnce(entrevistaDe({ estadoScoring: 'fallida' }))
      .mockResolvedValueOnce(
        entrevistaDe({
          estadoScoring: 'puntuada',
          score: { score: 7 } as never,
        }),
      );

    const dto = await servicio.puntuar(OWNER, IDEA, 'e1');

    expect(agente.solicitarScoring).toHaveBeenCalledWith(
      OWNER,
      expect.objectContaining({ id: 'e1' }),
    );
    expect(dto.estadoScoring).toBe('puntuada');
  });

  it('idea ajena → AccesoDenegado (403)', async () => {
    const { servicio, ideas, agente } = crear();
    ideas.asegurarPropia.mockRejectedValue(new AccesoDenegadoException());

    await expect(servicio.puntuar(OWNER, IDEA, 'e1')).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
    expect(agente.solicitarScoring).not.toHaveBeenCalled();
  });

  it('una entrevista inexistente → RecursoNoEncontrado (404)', async () => {
    const { servicio, agente } = crear();

    await expect(servicio.puntuar(OWNER, IDEA, 'e1')).rejects.toBeInstanceOf(
      RecursoNoEncontradoException,
    );
    expect(agente.solicitarScoring).not.toHaveBeenCalled();
  });
});

describe('EntrevistasService.eliminar', () => {
  it('elimina una entrevista propia', async () => {
    const { servicio, repo } = crear();
    const e = entrevistaDe();
    repo.findOne.mockResolvedValue(e);

    await servicio.eliminar(OWNER, IDEA, 'e1');

    expect(repo.remove).toHaveBeenCalledWith(e);
  });
});
