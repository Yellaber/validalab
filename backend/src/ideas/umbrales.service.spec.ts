import { Repository } from 'typeorm';
import {
  AccesoDenegadoException,
  RecursoNoEncontradoException,
  ValidacionFallidaException,
} from '../common/errors/dominio.exception';
import { CATALOGO_KPI, KPIS } from './kpi.catalog';
import { UmbralIdea } from './umbral.entity';
import { UmbralesService } from './umbrales.service';
import { IdeasService } from './ideas.service';
import { ActualizarUmbralDto } from './umbrales.dto';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

type IdeasMock = { asegurarPropia: jest.Mock };

const OWNER = 'owner-1';
const IDEA = 'idea-1';

function crear(): {
  servicio: UmbralesService;
  repo: RepoMock;
  ideas: IdeasMock;
} {
  const repo: RepoMock = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((x: Partial<UmbralIdea>) => x),
    save: jest.fn((x: UmbralIdea) =>
      Promise.resolve({ ...x, id: x.id ?? 'o1' }),
    ),
  };
  const ideas: IdeasMock = {
    asegurarPropia: jest.fn().mockResolvedValue({ id: IDEA, ownerId: OWNER }),
  };
  const servicio = new UmbralesService(
    repo as unknown as Repository<UmbralIdea>,
    ideas as unknown as IdeasService,
  );
  return { servicio, repo, ideas };
}

describe('UmbralesService.listar', () => {
  it('devuelve un umbral por cada KPI del catálogo con sus defaults', async () => {
    const { servicio, ideas } = crear();

    const lista = await servicio.listar(OWNER, IDEA);

    expect(ideas.asegurarPropia).toHaveBeenCalledWith(OWNER, IDEA);
    expect(lista).toHaveLength(KPIS.length);
    const respuesta = lista.find((u) => u.kpi === 'tasa_respuesta')!;
    expect(respuesta.umbralGo).toBe(CATALOGO_KPI.tasa_respuesta.umbralGo);
    expect(respuesta.umbralKill).toBe(CATALOGO_KPI.tasa_respuesta.umbralKill);
    expect(respuesta.grupo).toBe('outreach');
  });

  it('un KPI sin zona kill trae umbralKill null', async () => {
    const { servicio } = crear();

    const lista = await servicio.listar(OWNER, IDEA);

    expect(
      lista.find((u) => u.kpi === 'volumen_evidencia')!.umbralKill,
    ).toBeNull();
  });

  it('el override de la idea prevalece sobre el default', async () => {
    const { servicio, repo } = crear();
    repo.find.mockResolvedValue([
      { kpi: 'tasa_respuesta', umbralGo: 0.5, umbralKill: 0.2 } as UmbralIdea,
    ]);

    const lista = await servicio.listar(OWNER, IDEA);

    const respuesta = lista.find((u) => u.kpi === 'tasa_respuesta')!;
    expect(respuesta.umbralGo).toBe(0.5);
    expect(respuesta.umbralKill).toBe(0.2);
  });

  it('propaga el 403 si la idea es ajena', async () => {
    const { servicio, ideas } = crear();
    ideas.asegurarPropia.mockRejectedValue(new AccesoDenegadoException());

    await expect(servicio.listar(OWNER, IDEA)).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
  });
});

describe('UmbralesService.fijar', () => {
  const datos: ActualizarUmbralDto = { umbralGo: 0.35, umbralKill: 0.15 };

  it('hace upsert del override y devuelve el umbral resultante', async () => {
    const { servicio, repo } = crear();

    const dto = await servicio.fijar(
      OWNER,
      IDEA,
      'senal_disposicion_pago',
      datos,
    );

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ideaId: IDEA,
        kpi: 'senal_disposicion_pago',
        umbralGo: 0.35,
        umbralKill: 0.15,
      }),
    );
    expect(dto.umbralGo).toBe(0.35);
    expect(dto.umbralKill).toBe(0.15);
  });

  it('actualiza el override existente (idempotente, no crea otro)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue({
      id: 'o1',
      ideaId: IDEA,
      kpi: 'senal_disposicion_pago',
      umbralGo: 0.3,
      umbralKill: 0.1,
    });

    await servicio.fijar(OWNER, IDEA, 'senal_disposicion_pago', datos);

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'o1', umbralGo: 0.35 }),
    );
  });

  it('un KPI fuera del catálogo → RecursoNoEncontrado (404)', async () => {
    const { servicio, repo } = crear();

    await expect(
      servicio.fijar(OWNER, IDEA, 'no_existe', datos),
    ).rejects.toBeInstanceOf(RecursoNoEncontradoException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('umbralKill mayor que umbralGo → ValidacionFallida (422)', async () => {
    const { servicio, repo } = crear();

    await expect(
      servicio.fijar(OWNER, IDEA, 'senal_disposicion_pago', {
        umbralGo: 0.2,
        umbralKill: 0.5,
      }),
    ).rejects.toBeInstanceOf(ValidacionFallidaException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('permite umbralKill null (KPI sin zona kill)', async () => {
    const { servicio } = crear();

    const dto = await servicio.fijar(OWNER, IDEA, 'volumen_evidencia', {
      umbralGo: 20,
    });

    expect(dto.umbralKill).toBeNull();
    expect(dto.umbralGo).toBe(20);
  });

  it('propaga el 403 si la idea es ajena (antes de tocar el catálogo)', async () => {
    const { servicio, ideas } = crear();
    ideas.asegurarPropia.mockRejectedValue(new AccesoDenegadoException());

    await expect(
      servicio.fijar(OWNER, IDEA, 'no_existe', datos),
    ).rejects.toBeInstanceOf(AccesoDenegadoException);
  });
});
