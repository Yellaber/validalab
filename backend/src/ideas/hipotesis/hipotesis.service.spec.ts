import { Repository } from 'typeorm';
import {
  AccesoDenegadoException,
  RecursoNoEncontradoException,
} from '../../common/errors/dominio.exception';
import { Hipotesis } from './hipotesis.entity';
import { HipotesisService } from './hipotesis.service';
import { IdeasService } from '../idea/ideas.service';
import { CrearHipotesisDto } from './hipotesis.dto';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
};

type IdeasMock = { asegurarPropia: jest.Mock };

const OWNER = 'owner-1';
const IDEA = 'idea-1';

function crear(): {
  servicio: HipotesisService;
  repo: RepoMock;
  ideas: IdeasMock;
} {
  const repo: RepoMock = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((x: Partial<Hipotesis>) => x),
    save: jest.fn((x: Hipotesis) =>
      Promise.resolve({
        ...x,
        id: x.id ?? 'h1',
        fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
        fechaActualizacion: new Date('2026-01-02T00:00:00.000Z'),
      }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const ideas: IdeasMock = {
    asegurarPropia: jest.fn().mockResolvedValue({ id: IDEA, ownerId: OWNER }),
  };
  const servicio = new HipotesisService(
    repo as unknown as Repository<Hipotesis>,
    ideas as unknown as IdeasService,
  );
  return { servicio, repo, ideas };
}

function hipotesisDe(parcial: Partial<Hipotesis> = {}): Hipotesis {
  return {
    id: 'h1',
    ideaId: IDEA,
    tipo: 'problema',
    enunciado: 'El dolor existe',
    estado: 'pendiente',
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-01-02T00:00:00.000Z'),
    ...parcial,
  } as Hipotesis;
}

describe('HipotesisService.crear', () => {
  const datos: CrearHipotesisDto = { tipo: 'pago', enunciado: 'Pagarían' };

  it('verifica la idea propia y crea en estado pendiente con el ideaId del path', async () => {
    const { servicio, repo, ideas } = crear();

    const dto = await servicio.crear(OWNER, IDEA, datos);

    expect(ideas.asegurarPropia).toHaveBeenCalledWith(OWNER, IDEA);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ideaId: IDEA, estado: 'pendiente' }),
    );
    expect(dto.ideaId).toBe(IDEA);
    expect(dto.estado).toBe('pendiente');
  });

  it('propaga el 403 si la idea es ajena (no toca hipótesis)', async () => {
    const { servicio, repo, ideas } = crear();
    ideas.asegurarPropia.mockRejectedValue(new AccesoDenegadoException());

    await expect(servicio.crear(OWNER, IDEA, datos)).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('HipotesisService.listar', () => {
  it('verifica la idea propia y devuelve sus hipótesis', async () => {
    const { servicio, repo, ideas } = crear();
    repo.find.mockResolvedValue([hipotesisDe()]);

    const lista = await servicio.listar(OWNER, IDEA);

    expect(ideas.asegurarPropia).toHaveBeenCalledWith(OWNER, IDEA);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ideaId: IDEA } }),
    );
    expect(lista).toHaveLength(1);
    expect(lista[0].ideaId).toBe(IDEA);
  });
});

describe('HipotesisService.actualizar', () => {
  it('marca el estado y edita solo los campos presentes', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(hipotesisDe());

    const dto = await servicio.actualizar(OWNER, IDEA, 'h1', {
      estado: 'confirmada',
    });

    expect(dto.estado).toBe('confirmada');
    expect(dto.enunciado).toBe('El dolor existe');
  });

  it('una hipótesis inexistente en la idea → RecursoNoEncontrado (404)', async () => {
    const { servicio } = crear();

    await expect(
      servicio.actualizar(OWNER, IDEA, 'h1', { estado: 'refutada' }),
    ).rejects.toBeInstanceOf(RecursoNoEncontradoException);
  });

  it('busca la hipótesis exigiendo que pertenezca a la idea', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(hipotesisDe());

    await servicio.actualizar(OWNER, IDEA, 'h1', { tipo: 'mercado' });

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'h1', ideaId: IDEA },
    });
  });
});

describe('HipotesisService.eliminar', () => {
  it('elimina una hipótesis propia', async () => {
    const { servicio, repo } = crear();
    const h = hipotesisDe();
    repo.findOne.mockResolvedValue(h);

    await servicio.eliminar(OWNER, IDEA, 'h1');

    expect(repo.remove).toHaveBeenCalledWith(h);
  });

  it('eliminar una hipótesis inexistente → RecursoNoEncontrado (404)', async () => {
    const { servicio, repo } = crear();

    await expect(servicio.eliminar(OWNER, IDEA, 'h1')).rejects.toBeInstanceOf(
      RecursoNoEncontradoException,
    );
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('propaga el 403 si la idea es ajena', async () => {
    const { servicio, ideas } = crear();
    ideas.asegurarPropia.mockRejectedValue(new AccesoDenegadoException());

    await expect(servicio.eliminar(OWNER, IDEA, 'h1')).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
  });
});
