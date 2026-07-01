import { Repository } from 'typeorm';
import {
  AccesoDenegadoException,
  ConflictoException,
  RecursoNoEncontradoException,
} from '../common/errors/dominio.exception';
import { Idea } from './idea.entity';
import { IdeasService } from './ideas.service';
import { CrearIdeaDto, ListarIdeasQuery } from './ideas.dto';

type RepoMock = {
  findOne: jest.Mock;
  findAndCount: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function crear(): { servicio: IdeasService; repo: RepoMock } {
  const repo: RepoMock = {
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn((x: Partial<Idea>) => x),
    save: jest.fn((x: Idea) =>
      Promise.resolve({
        ...x,
        id: x.id ?? 'i1',
        fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
        fechaActualizacion: new Date('2026-01-02T00:00:00.000Z'),
      }),
    ),
  };
  const servicio = new IdeasService(repo as unknown as Repository<Idea>);
  return { servicio, repo };
}

const OWNER = 'owner-1';
const AJENO = 'owner-2';

function ideaDe(parcial: Partial<Idea> = {}): Idea {
  return {
    id: 'i1',
    ownerId: OWNER,
    titulo: 'Mi idea',
    descripcion: null,
    problema: 'Un problema que duele',
    segmentoBeachhead: null,
    estado: 'borrador',
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-01-02T00:00:00.000Z'),
    ...parcial,
  } as Idea;
}

describe('IdeasService.crear', () => {
  const datos: CrearIdeaDto = {
    titulo: 'Mi idea',
    problema: 'Un problema que duele',
  };

  it('crea la idea en estado borrador con el ownerId del token', async () => {
    const { servicio, repo } = crear();

    const dto = await servicio.crear(OWNER, datos);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: OWNER, estado: 'borrador' }),
    );
    expect(dto.ownerId).toBe(OWNER);
    expect(dto.estado).toBe('borrador');
  });

  it('no acepta un ownerId del cuerpo: siempre usa el del token', async () => {
    const { servicio, repo } = crear();

    await servicio.crear(OWNER, {
      ...datos,
      ownerId: AJENO,
    } as unknown as CrearIdeaDto);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: OWNER }),
    );
  });
});

describe('IdeasService.listar', () => {
  const query: ListarIdeasQuery = { pagina: 1, porPagina: 20 };

  it('filtra siempre por owner_id y devuelve el sobre paginado', async () => {
    const { servicio, repo } = crear();
    repo.findAndCount.mockResolvedValue([[ideaDe()], 1]);

    const res = await servicio.listar(OWNER, query);

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: OWNER } }),
    );
    expect(res.paginacion).toEqual({
      pagina: 1,
      porPagina: 20,
      total: 1,
      totalPaginas: 1,
    });
    expect(res.datos[0].ownerId).toBe(OWNER);
  });

  it('añade el estado al filtro cuando se solicita', async () => {
    const { servicio, repo } = crear();

    await servicio.listar(OWNER, { ...query, estado: 'archivada' });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: OWNER, estado: 'archivada' },
      }),
    );
  });
});

describe('IdeasService.obtener', () => {
  it('devuelve la idea propia', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(ideaDe());

    const dto = await servicio.obtener(OWNER, 'i1');

    expect(dto.id).toBe('i1');
  });

  it('una idea de otro usuario → AccesoDenegado (403)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(ideaDe({ ownerId: AJENO }));

    await expect(servicio.obtener(OWNER, 'i1')).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
  });

  it('una idea inexistente → RecursoNoEncontrado (404)', async () => {
    const { servicio } = crear();

    await expect(servicio.obtener(OWNER, 'i1')).rejects.toBeInstanceOf(
      RecursoNoEncontradoException,
    );
  });
});

describe('IdeasService.actualizar', () => {
  it('edita solo los campos presentes y nunca cambia el estado', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(ideaDe({ estado: 'en_validacion' }));

    const dto = await servicio.actualizar(OWNER, 'i1', {
      problema: 'Otro problema',
    });

    expect(dto.problema).toBe('Otro problema');
    expect(dto.titulo).toBe('Mi idea');
    expect(dto.estado).toBe('en_validacion');
  });

  it('editar una idea ajena → AccesoDenegado (403)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(ideaDe({ ownerId: AJENO }));

    await expect(
      servicio.actualizar(OWNER, 'i1', { titulo: 'x' }),
    ).rejects.toBeInstanceOf(AccesoDenegadoException);
  });
});

describe('IdeasService.archivar', () => {
  it('marca la idea propia como archivada sin eliminarla', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(ideaDe());

    const dto = await servicio.archivar(OWNER, 'i1');

    expect(dto.estado).toBe('archivada');
    expect(repo.save).toHaveBeenCalled();
  });

  it('archivar una idea ajena → AccesoDenegado (403)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(ideaDe({ ownerId: AJENO }));

    await expect(servicio.archivar(OWNER, 'i1')).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
  });
});

describe('IdeasService.desarchivar', () => {
  it('reabre una idea archivada devolviéndola a borrador', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(ideaDe({ estado: 'archivada' }));

    const dto = await servicio.desarchivar(OWNER, 'i1');

    expect(dto.estado).toBe('borrador');
  });

  it('desarchivar una idea que no estaba archivada → Conflicto (409)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(ideaDe({ estado: 'borrador' }));

    await expect(servicio.desarchivar(OWNER, 'i1')).rejects.toBeInstanceOf(
      ConflictoException,
    );
  });

  it('desarchivar una idea ajena → AccesoDenegado (403)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(
      ideaDe({ ownerId: AJENO, estado: 'archivada' }),
    );

    await expect(servicio.desarchivar(OWNER, 'i1')).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
  });
});
