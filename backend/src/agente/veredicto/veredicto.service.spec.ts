import { Repository } from 'typeorm';
import {
  AccesoDenegadoException,
  ConflictoException,
  ProveedorNoDisponibleException,
  SalidaAgenteInvalidaException,
  ValidacionFallidaException,
} from '../../common/errors/dominio.exception';
import { AppConfigService } from '../../config/app-config.service';
import { HipotesisService } from '../../ideas/hipotesis/hipotesis.service';
import { IdeasService } from '../../ideas/idea/ideas.service';
import { UmbralesService } from '../../ideas/umbral/umbrales.service';
import { TableroIdea } from '../../kpis/tablero/kpis-respuesta';
import { KpisService } from '../../kpis/tablero/kpis.service';
import { ModeloDeChatFactory } from '../proveedor/modelo-chat.factory';
import { ejecutarAgente } from '../comun/ejecutar-agente';
import { EjecucionAgente } from '../ejecucion/ejecucion-agente.entity';
import { Veredicto } from './veredicto.entity';
import { VeredictoService } from './veredicto.service';

jest.mock('../comun/ejecutar-agente');
const ejecutarAgenteMock = ejecutarAgente as jest.Mock;

const OWNER = 'owner-1';
const IDEA = 'idea-1';

function tableroDe(
  enZonaGo: number,
  enZonaKill: number,
  sinDatos = 0,
): TableroIdea {
  return {
    ideaId: IDEA,
    fechaCalculo: new Date().toISOString(),
    resumen: {
      enZonaGo,
      enObservacion: 0,
      enZonaKill,
      sinDatos,
      totalKpis: enZonaGo + enZonaKill + sinDatos,
    },
    kpis: [
      {
        kpi: 'tasa_respuesta',
        grupo: 'outreach',
        unidad: 'porcentaje',
        valor: 0.3,
        numerador: 3,
        denominador: 10,
        umbralGo: 0.25,
        umbralKill: 0.1,
        zona: 'go',
      },
    ],
  };
}

function veredictoDe(parcial: Partial<Veredicto> = {}): Veredicto {
  return {
    id: 'v1',
    ideaId: IDEA,
    veredicto: 'pivote',
    confianza: 60,
    justificacionPorKPI: [],
    recomendaciones: [],
    proveedor: 'fake',
    modelo: 'fake',
    snapshotKpis: [],
    estadoVerificacion: 'pendiente',
    verificacion: null,
    fechaEmision: new Date('2026-07-11T00:00:00.000Z'),
    ...parcial,
  };
}

function crear(modo: 'real' | 'fake', tablero: TableroIdea = tableroDe(2, 0)) {
  const veredictos = {
    create: jest.fn((x: Partial<Veredicto>) => x),
    save: jest.fn((x: Veredicto) =>
      Promise.resolve({
        ...x,
        id: x.id ?? 'v1',
        fechaEmision: x.fechaEmision ?? new Date('2026-07-11T00:00:00.000Z'),
      }),
    ),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  const kpis = { calcularTablero: jest.fn().mockResolvedValue(tablero) };
  const factory = {
    crear: jest.fn().mockResolvedValue({
      modelo: {},
      proveedor: 'anthropic',
      nombreModelo: 'claude',
    }),
  };
  const ideas = {
    asegurarPropia: jest.fn().mockResolvedValue({ id: IDEA }),
    fijarEstadoPorVeredicto: jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    agente: {
      modo,
      maxIteraciones: 6,
      maxReintentos: 2,
      timeoutMs: 30000,
      versionRubrica: 'v2',
    },
  };
  const ejecuciones = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn((x: unknown) => Promise.resolve(x)),
  };
  const servicio = new VeredictoService(
    veredictos as unknown as Repository<Veredicto>,
    ejecuciones as unknown as Repository<EjecucionAgente>,
    kpis as unknown as KpisService,
    factory as unknown as ModeloDeChatFactory,
    {} as HipotesisService,
    {} as UmbralesService,
    ideas as unknown as IdeasService,
    config as unknown as AppConfigService,
  );
  return { servicio, veredictos, ejecuciones, kpis, factory, ideas };
}

beforeEach(() => ejecutarAgenteMock.mockReset());

describe('VeredictoService.emitir (modo fake)', () => {
  it('deriva el veredicto del semáforo y persiste pendiente con snapshot', async () => {
    const { servicio, veredictos, ejecuciones } = crear(
      'fake',
      tableroDe(0, 3),
    ); // más kill que go

    const dto = await servicio.emitir(OWNER, IDEA);

    expect(dto.veredicto).toBe('kill');
    expect(dto.estadoVerificacion).toBe('pendiente');
    expect(dto.proveedor).toBe('fake');
    expect(veredictos.create).toHaveBeenCalledWith(
      expect.objectContaining({ estadoVerificacion: 'pendiente' }),
    );
    // deja traza en el ledger único (tarea veredicto, sin entrevista)
    expect(ejecuciones.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tarea: 'veredicto',
        ideaId: IDEA,
        entrevistaId: null,
        ownerId: OWNER,
      }),
    );
  });

  it('go cuando dominan los KPIs en go; confianza baja con sin_datos', async () => {
    const { servicio } = crear('fake', tableroDe(3, 0, 1)); // 3 go, 1 sin datos de 4

    const dto = await servicio.emitir(OWNER, IDEA);

    expect(dto.veredicto).toBe('go');
    expect(dto.confianza).toBe(75); // 3 de 4 con datos
  });
});

describe('VeredictoService.emitir (modo real, errores)', () => {
  it('sin config BYOK → Conflicto (409)', async () => {
    const { servicio, factory } = crear('real');
    factory.crear.mockRejectedValue(new ConflictoException());

    await expect(servicio.emitir(OWNER, IDEA)).rejects.toBeInstanceOf(
      ConflictoException,
    );
  });

  it('salida inválida tras reintentos → SalidaAgenteInvalida (502)', async () => {
    const { servicio } = crear('real');
    ejecutarAgenteMock.mockRejectedValue(
      new Error('El agente no produjo una salida válida tras 3 intento(s): x'),
    );

    await expect(servicio.emitir(OWNER, IDEA)).rejects.toBeInstanceOf(
      SalidaAgenteInvalidaException,
    );
  });

  it('proveedor caído → ProveedorNoDisponible (503)', async () => {
    const { servicio } = crear('real');
    ejecutarAgenteMock.mockRejectedValue(new Error('fetch failed'));

    await expect(servicio.emitir(OWNER, IDEA)).rejects.toBeInstanceOf(
      ProveedorNoDisponibleException,
    );
  });
});

describe('VeredictoService.verificar', () => {
  it('aprobar fija el estado de la idea y marca aprobado', async () => {
    const { servicio, veredictos, ideas } = crear('fake');
    veredictos.findOne.mockResolvedValue(veredictoDe({ veredicto: 'pivote' }));

    const dto = await servicio.verificar(OWNER, IDEA, 'v1', {
      resultado: 'aprobado',
    });

    expect(dto.estadoVerificacion).toBe('aprobado');
    expect(ideas.fijarEstadoPorVeredicto).toHaveBeenCalledWith(
      OWNER,
      IDEA,
      'pivote',
    );
  });

  it('anular exige nota y no cambia la idea', async () => {
    const { servicio, veredictos, ideas } = crear('fake');
    veredictos.findOne.mockResolvedValue(veredictoDe());

    const dto = await servicio.verificar(OWNER, IDEA, 'v1', {
      resultado: 'anulado',
      nota: 'no me convence',
    });

    expect(dto.estadoVerificacion).toBe('anulado');
    expect(ideas.fijarEstadoPorVeredicto).not.toHaveBeenCalled();
  });

  it('anular sin nota → ValidacionFallida (422)', async () => {
    const { servicio, veredictos } = crear('fake');
    veredictos.findOne.mockResolvedValue(veredictoDe());

    await expect(
      servicio.verificar(OWNER, IDEA, 'v1', { resultado: 'anulado' }),
    ).rejects.toBeInstanceOf(ValidacionFallidaException);
  });

  it('un veredicto ya verificado → Conflicto (409)', async () => {
    const { servicio, veredictos } = crear('fake');
    veredictos.findOne.mockResolvedValue(
      veredictoDe({ estadoVerificacion: 'aprobado' }),
    );

    await expect(
      servicio.verificar(OWNER, IDEA, 'v1', {
        resultado: 'anulado',
        nota: 'x',
      }),
    ).rejects.toBeInstanceOf(ConflictoException);
  });
});

describe('VeredictoService.listar / obtener', () => {
  it('propaga AccesoDenegado si la idea es ajena', async () => {
    const { servicio, ideas } = crear('fake');
    ideas.asegurarPropia.mockRejectedValue(new AccesoDenegadoException());

    await expect(
      servicio.listar(OWNER, IDEA, { pagina: 1, porPagina: 20 }),
    ).rejects.toBeInstanceOf(AccesoDenegadoException);
  });
});
