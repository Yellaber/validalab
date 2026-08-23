import { Repository } from 'typeorm';
import {
  AccesoDenegadoException,
  RecursoNoEncontradoException,
} from '../../common/errors/dominio.exception';
import { IdeasService } from '../../ideas/idea/ideas.service';
import { KpiCalculado, TableroIdea } from '../tablero/kpis-respuesta';
import { KpisService } from '../tablero/kpis.service';
import { ZonaKpi } from '../zona-kpi';
import { AlertaKpi } from './alerta-kpi.entity';
import { AlertasService } from './alertas.service';
import { EstadoSemaforoKpi } from './estado-semaforo-kpi.entity';

const OWNER = 'owner-1';
const IDEA = 'idea-1';

function kpiCalc(zona: ZonaKpi): KpiCalculado {
  return {
    kpi: 'tasa_respuesta',
    grupo: 'outreach',
    unidad: 'porcentaje',
    valor: 0.05,
    numerador: 1,
    denominador: 20,
    umbralGo: 0.25,
    umbralKill: 0.1,
    zona,
  };
}

function tablero(zona: ZonaKpi): TableroIdea {
  return {
    ideaId: IDEA,
    fechaCalculo: new Date().toISOString(),
    resumen: {
      enZonaGo: 0,
      enObservacion: 0,
      enZonaKill: 0,
      sinDatos: 0,
      totalKpis: 1,
    },
    kpis: [kpiCalc(zona)],
  };
}

/** Monta el servicio con un manager de transacción falso y repos mockeados. */
function crear(zonaNueva: ZonaKpi, previos: Partial<EstadoSemaforoKpi>[]) {
  const estadosRepo = {
    find: jest.fn().mockResolvedValue(previos),
    create: jest.fn((x: Partial<EstadoSemaforoKpi>) => x),
    save: jest.fn((x: EstadoSemaforoKpi) => Promise.resolve(x)),
  };
  const alertasTxRepo = {
    create: jest.fn((x: Partial<AlertaKpi>) => x),
    save: jest.fn((x: AlertaKpi) => Promise.resolve(x)),
  };
  const manager = {
    getRepository: (entidad: unknown) =>
      entidad === EstadoSemaforoKpi ? estadosRepo : alertasTxRepo,
  };
  const dataSource = {
    transaction: (cb: (m: unknown) => Promise<void>) => cb(manager),
  };
  const alertasRepo = {
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn((x: AlertaKpi) => Promise.resolve(x)),
  };
  const kpis = {
    calcularTablero: jest.fn().mockResolvedValue(tablero(zonaNueva)),
  };
  const ideas = { asegurarPropia: jest.fn().mockResolvedValue({ id: IDEA }) };
  const servicio = new AlertasService(
    alertasRepo as unknown as Repository<AlertaKpi>,
    kpis as unknown as KpisService,
    ideas as unknown as IdeasService,
    dataSource as never,
  );
  return { servicio, estadosRepo, alertasTxRepo, alertasRepo, ideas };
}

describe('AlertasService.evaluarIdea', () => {
  it('crea una alerta cuando un KPI cruza a kill', async () => {
    const { servicio, alertasTxRepo, estadosRepo } = crear('kill', [
      { kpi: 'tasa_respuesta', zona: 'observacion' },
    ]);

    await servicio.evaluarIdea(OWNER, IDEA);

    expect(alertasTxRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        kpi: 'tasa_respuesta',
        tipo: 'kill',
        umbral: 0.1,
      }),
    );
    expect(estadosRepo.save).toHaveBeenCalled(); // actualiza la zona
  });

  it('no duplica si la zona no cambió', async () => {
    const { servicio, alertasTxRepo, estadosRepo } = crear('kill', [
      { kpi: 'tasa_respuesta', zona: 'kill' },
    ]);

    await servicio.evaluarIdea(OWNER, IDEA);

    expect(alertasTxRepo.save).not.toHaveBeenCalled();
    expect(estadosRepo.save).not.toHaveBeenCalled();
  });

  it('la primera evaluación registra la zona sin alertar', async () => {
    const { servicio, alertasTxRepo, estadosRepo } = crear('kill', []);

    await servicio.evaluarIdea(OWNER, IDEA);

    expect(alertasTxRepo.save).not.toHaveBeenCalled();
    expect(estadosRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ kpi: 'tasa_respuesta', zona: 'kill' }),
    );
  });

  it('cambiar a observacion no genera alerta pero actualiza la zona', async () => {
    const { servicio, alertasTxRepo, estadosRepo } = crear('observacion', [
      { kpi: 'tasa_respuesta', zona: 'kill' },
    ]);

    await servicio.evaluarIdea(OWNER, IDEA);

    expect(alertasTxRepo.save).not.toHaveBeenCalled();
    expect(estadosRepo.save).toHaveBeenCalled();
  });
});

describe('AlertasService.listar / marcarLeida', () => {
  it('propaga AccesoDenegado si la idea es ajena', async () => {
    const { servicio, ideas } = crear('go', []);
    ideas.asegurarPropia.mockRejectedValue(new AccesoDenegadoException());

    await expect(
      servicio.listar(OWNER, IDEA, { pagina: 1, porPagina: 20 }),
    ).rejects.toBeInstanceOf(AccesoDenegadoException);
  });

  it('marcar una alerta inexistente → RecursoNoEncontrado', async () => {
    const { servicio } = crear('go', []);

    await expect(
      servicio.marcarLeida(OWNER, IDEA, 'a1', true),
    ).rejects.toBeInstanceOf(RecursoNoEncontradoException);
  });
});
