import { Repository } from 'typeorm';
import {
  AccesoDenegadoException,
  ConflictoException,
  RecursoNoEncontradoException,
  ValidacionFallidaException,
} from '../common/errors/dominio.exception';
import { Contacto } from './contacto.entity';
import { ContactosService } from './contactos.service';
import { IdeasService } from '../ideas/idea/ideas.service';
import { CrearContactoDto } from './contactos.dto';

type RepoMock = {
  find: jest.Mock;
  findAndCount: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
};

type IdeasMock = { asegurarPropia: jest.Mock };

const OWNER = 'owner-1';
const IDEA = 'idea-1';

function crear(): {
  servicio: ContactosService;
  repo: RepoMock;
  ideas: IdeasMock;
} {
  const repo: RepoMock = {
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((x: Partial<Contacto>) => x),
    save: jest.fn((x: Contacto) =>
      Promise.resolve({
        ...x,
        id: x.id ?? 'c1',
        fechaCreacion: x.fechaCreacion ?? new Date('2026-01-01T00:00:00.000Z'),
        fechaActualizacion:
          x.fechaActualizacion ?? new Date('2026-01-02T00:00:00.000Z'),
      }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const ideas: IdeasMock = {
    asegurarPropia: jest.fn().mockResolvedValue({ id: IDEA, ownerId: OWNER }),
  };
  const servicio = new ContactosService(
    repo as unknown as Repository<Contacto>,
    ideas as unknown as IdeasService,
  );
  return { servicio, repo, ideas };
}

function contactoDe(parcial: Partial<Contacto> = {}): Contacto {
  return {
    id: 'c1',
    ideaId: IDEA,
    nombre: 'Ana',
    perfil: null,
    enlace: null,
    canal: 'linkedin',
    origen: 'busqueda_directa',
    referidoPorId: null,
    estado: 'por_contactar',
    primerToqueEn: null,
    segundoToqueEn: null,
    notas: null,
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-01-02T00:00:00.000Z'),
    ...parcial,
  } as Contacto;
}

describe('ContactosService.crear', () => {
  const datos: CrearContactoDto = { nombre: 'Ana' };

  it('verifica la idea propia y crea en por_contactar con defaults e ideaId del path', async () => {
    const { servicio, repo, ideas } = crear();

    const dto = await servicio.crear(OWNER, IDEA, datos);

    expect(ideas.asegurarPropia).toHaveBeenCalledWith(OWNER, IDEA);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ideaId: IDEA,
        canal: 'otro',
        origen: 'busqueda_directa',
        estado: 'por_contactar',
      }),
    );
    expect(dto.ideaId).toBe(IDEA);
    expect(dto.estado).toBe('por_contactar');
  });

  it('acepta un referidoPorId que existe en la misma idea', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(contactoDe({ id: 'ref-1' }));

    await servicio.crear(OWNER, IDEA, {
      nombre: 'Beto',
      origen: 'referido',
      referidoPorId: 'ref-1',
    });

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'ref-1', ideaId: IDEA },
    });
    expect(repo.save).toHaveBeenCalled();
  });

  it('rechaza un referidoPorId que no existe en la idea → ValidacionFallida (422)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(null);

    await expect(
      servicio.crear(OWNER, IDEA, { nombre: 'Beto', referidoPorId: 'ajeno' }),
    ).rejects.toBeInstanceOf(ValidacionFallidaException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('propaga el 403 si la idea es ajena', async () => {
    const { servicio, ideas, repo } = crear();
    ideas.asegurarPropia.mockRejectedValue(new AccesoDenegadoException());

    await expect(servicio.crear(OWNER, IDEA, datos)).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('ContactosService.listar', () => {
  const query = { pagina: 1, porPagina: 20 };

  it('filtra por ideaId y devuelve el sobre paginado', async () => {
    const { servicio, repo } = crear();
    repo.findAndCount.mockResolvedValue([[contactoDe()], 1]);

    const res = await servicio.listar(OWNER, IDEA, query);

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ideaId: IDEA } }),
    );
    expect(res.paginacion.total).toBe(1);
    expect(res.datos[0].ideaId).toBe(IDEA);
  });

  it('añade el estado al filtro cuando se solicita', async () => {
    const { servicio, repo } = crear();

    await servicio.listar(OWNER, IDEA, { ...query, estado: 'agendado' });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ideaId: IDEA, estado: 'agendado' } }),
    );
  });
});

describe('ContactosService.obtener/actualizar/eliminar', () => {
  it('un contacto inexistente en la idea → RecursoNoEncontrado (404)', async () => {
    const { servicio } = crear();

    await expect(servicio.obtener(OWNER, IDEA, 'c1')).rejects.toBeInstanceOf(
      RecursoNoEncontradoException,
    );
  });

  it('edita solo los campos presentes sin tocar el estado', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(contactoDe({ estado: 'contactado' }));

    const dto = await servicio.actualizar(OWNER, IDEA, 'c1', { perfil: 'CTO' });

    expect(dto.perfil).toBe('CTO');
    expect(dto.estado).toBe('contactado');
  });

  it('rechaza auto-referencia en referidoPorId → ValidacionFallida (422)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(contactoDe());

    await expect(
      servicio.actualizar(OWNER, IDEA, 'c1', { referidoPorId: 'c1' }),
    ).rejects.toBeInstanceOf(ValidacionFallidaException);
  });

  it('elimina un contacto propio', async () => {
    const { servicio, repo } = crear();
    const c = contactoDe();
    repo.findOne.mockResolvedValue(c);

    await servicio.eliminar(OWNER, IDEA, 'c1');

    expect(repo.remove).toHaveBeenCalledWith(c);
  });
});

describe('ContactosService.transicionar', () => {
  it('avanza por una transición válida', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(contactoDe({ estado: 'por_contactar' }));

    const dto = await servicio.transicionar(OWNER, IDEA, 'c1', 'contactado');

    expect(dto.estado).toBe('contactado');
  });

  it('una transición inválida → Conflicto (409)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(contactoDe({ estado: 'por_contactar' }));

    await expect(
      servicio.transicionar(OWNER, IDEA, 'c1', 'agendado'),
    ).rejects.toBeInstanceOf(ConflictoException);
  });

  it('pedir entrevistado → Conflicto (409)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(contactoDe({ estado: 'agendado' }));

    await expect(
      servicio.transicionar(OWNER, IDEA, 'c1', 'entrevistado'),
    ).rejects.toBeInstanceOf(ConflictoException);
  });
});

describe('ContactosService.registrarToque', () => {
  it('registra el primer toque', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(contactoDe());

    const dto = await servicio.registrarToque(
      OWNER,
      IDEA,
      'c1',
      '2026-02-01T00:00:00.000Z',
    );

    expect(dto.primerToqueEn).toBe('2026-02-01T00:00:00.000Z');
    expect(dto.segundoToqueEn).toBeNull();
  });

  it('registra el segundo toque cuando ya hay primero', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(
      contactoDe({ primerToqueEn: new Date('2026-02-01T00:00:00.000Z') }),
    );

    const dto = await servicio.registrarToque(
      OWNER,
      IDEA,
      'c1',
      '2026-02-05T00:00:00.000Z',
    );

    expect(dto.segundoToqueEn).toBe('2026-02-05T00:00:00.000Z');
  });

  it('un tercer toque → Conflicto (409)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(
      contactoDe({
        primerToqueEn: new Date('2026-02-01T00:00:00.000Z'),
        segundoToqueEn: new Date('2026-02-05T00:00:00.000Z'),
      }),
    );

    await expect(
      servicio.registrarToque(OWNER, IDEA, 'c1'),
    ).rejects.toBeInstanceOf(ConflictoException);
  });
});
