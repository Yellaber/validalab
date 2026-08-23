import { Repository } from 'typeorm';
import {
  AccesoDenegadoException,
  RecursoNoEncontradoException,
} from '../../common/errors/dominio.exception';
import { Guion } from './guion.entity';
import { GuionesService } from './guiones.service';
import { CrearGuionDto } from './guiones.dto';

type RepoMock = {
  findAndCount: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
};

const OWNER = 'owner-1';
const AJENO = 'owner-2';

function crear(): { servicio: GuionesService; repo: RepoMock } {
  const repo: RepoMock = {
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((x: Partial<Guion>) => x),
    save: jest.fn((x: Guion) =>
      Promise.resolve({
        ...x,
        id: x.id ?? 'g1',
        fechaCreacion: x.fechaCreacion ?? new Date('2026-01-01T00:00:00.000Z'),
        fechaActualizacion:
          x.fechaActualizacion ?? new Date('2026-01-02T00:00:00.000Z'),
      }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const servicio = new GuionesService(repo as unknown as Repository<Guion>);
  return { servicio, repo };
}

function guionDe(parcial: Partial<Guion> = {}): Guion {
  return {
    id: 'g1',
    ownerId: OWNER,
    nombre: 'Descubrimiento',
    descripcion: null,
    preguntas: [{ id: 'p1', orden: 1, texto: '¿Cuál es tu mayor dolor?' }],
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-01-02T00:00:00.000Z'),
    ...parcial,
  } as Guion;
}

describe('GuionesService.crear', () => {
  const datos: CrearGuionDto = {
    nombre: 'Descubrimiento',
    preguntas: [
      { orden: 2, texto: 'Segunda' },
      { orden: 1, texto: 'Primera' },
    ],
  };

  it('crea con ownerId del token y genera un id por pregunta', async () => {
    const { servicio, repo } = crear();

    const dto = await servicio.crear(OWNER, datos);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: OWNER }),
    );
    expect(dto.ownerId).toBe(OWNER);
    expect(dto.preguntas).toHaveLength(2);
    expect(dto.preguntas.every((p) => typeof p.id === 'string')).toBe(true);
  });

  it('devuelve las preguntas ordenadas por orden', async () => {
    const { servicio } = crear();

    const dto = await servicio.crear(OWNER, datos);

    expect(dto.preguntas.map((p) => p.orden)).toEqual([1, 2]);
    expect(dto.preguntas[0].texto).toBe('Primera');
  });
});

describe('GuionesService.listar', () => {
  it('filtra por ownerId y devuelve el sobre paginado', async () => {
    const { servicio, repo } = crear();
    repo.findAndCount.mockResolvedValue([[guionDe()], 1]);

    const res = await servicio.listar(OWNER, { pagina: 1, porPagina: 20 });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: OWNER } }),
    );
    expect(res.paginacion.total).toBe(1);
    expect(res.datos[0].ownerId).toBe(OWNER);
  });
});

describe('GuionesService.obtener', () => {
  it('devuelve el guión propio', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(guionDe());

    const dto = await servicio.obtener(OWNER, 'g1');

    expect(dto.id).toBe('g1');
  });

  it('un guión ajeno → AccesoDenegado (403)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(guionDe({ ownerId: AJENO }));

    await expect(servicio.obtener(OWNER, 'g1')).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
  });

  it('un guión inexistente → RecursoNoEncontrado (404)', async () => {
    const { servicio } = crear();

    await expect(servicio.obtener(OWNER, 'g1')).rejects.toBeInstanceOf(
      RecursoNoEncontradoException,
    );
  });
});

describe('GuionesService.actualizar', () => {
  it('reemplaza el conjunto de preguntas con ids nuevos', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(guionDe());

    const dto = await servicio.actualizar(OWNER, 'g1', {
      preguntas: [{ orden: 1, texto: 'Nueva única' }],
    });

    expect(dto.preguntas).toHaveLength(1);
    expect(dto.preguntas[0].texto).toBe('Nueva única');
    expect(typeof dto.preguntas[0].id).toBe('string');
  });

  it('editar un guión ajeno → AccesoDenegado (403)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(guionDe({ ownerId: AJENO }));

    await expect(
      servicio.actualizar(OWNER, 'g1', { nombre: 'x' }),
    ).rejects.toBeInstanceOf(AccesoDenegadoException);
  });
});

describe('GuionesService.eliminar', () => {
  it('elimina un guión propio', async () => {
    const { servicio, repo } = crear();
    const g = guionDe();
    repo.findOne.mockResolvedValue(g);

    await servicio.eliminar(OWNER, 'g1');

    expect(repo.remove).toHaveBeenCalledWith(g);
  });
});
