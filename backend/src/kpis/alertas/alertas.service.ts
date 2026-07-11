import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RecursoNoEncontradoException } from '../../common/errors/dominio.exception';
import {
  crearRespuestaPaginada,
  RespuestaPaginada,
} from '../../common/pagination/respuesta-paginada';
import { IdeasService } from '../../ideas/idea/ideas.service';
import { KpiCalculado } from '../tablero/kpis-respuesta';
import { KpisService } from '../tablero/kpis.service';
import { AlertaKpi } from './alerta-kpi.entity';
import { aAlertaDto, AlertaKpiRespuesta } from './alertas-respuesta';
import { ListarAlertasQuery } from './alertas.dto';
import { EstadoSemaforoKpi } from './estado-semaforo-kpi.entity';

/**
 * Genera y expone las alertas de cruce de umbral (RF-13, E5b). La generación es
 * dirigida por evento: `AgenteService` llama a `evaluarIdea` tras un scoring
 * exitoso. El cruce se detecta comparando la zona nueva de cada KPI contra la
 * última persistida en `estado_semaforo_kpi`; solo se alerta al ENTRAR en
 * `go`/`kill`, y nunca dos veces por la misma zona.
 */
@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    @InjectRepository(AlertaKpi)
    private readonly alertas: Repository<AlertaKpi>,
    private readonly kpis: KpisService,
    private readonly ideas: IdeasService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Reevalúa el tablero de una idea y emite alertas por los KPIs que cruzaron a
   * `go`/`kill` desde su última zona conocida. Idempotente por zona (no duplica).
   * Corre en una transacción que bloquea las filas de semáforo de la idea para
   * serializar evaluaciones concurrentes del mismo tablero.
   */
  async evaluarIdea(ownerId: string, ideaId: string): Promise<void> {
    const tablero = await this.kpis.calcularTablero(ownerId, ideaId);

    await this.dataSource.transaction(async (manager) => {
      const estados = manager.getRepository(EstadoSemaforoKpi);
      const alertas = manager.getRepository(AlertaKpi);

      const previos = await estados.find({
        where: { ideaId },
        lock: { mode: 'pessimistic_write' },
      });
      const porKpi = new Map(previos.map((e) => [e.kpi, e]));

      for (const kpi of tablero.kpis) {
        const anterior = porKpi.get(kpi.kpi);
        if (!anterior) {
          // Primera evaluación: registra la zona sin alertar (no hay cruce).
          await estados.save(
            estados.create({ ideaId, kpi: kpi.kpi, zona: kpi.zona }),
          );
          continue;
        }
        if (anterior.zona === kpi.zona) {
          continue; // sin cambio de zona: nada que hacer
        }
        if (kpi.zona === 'go' || kpi.zona === 'kill') {
          await alertas.save(alertas.create(this.aAlerta(ideaId, kpi)));
        }
        anterior.zona = kpi.zona;
        await estados.save(anterior);
      }
    });
  }

  /** Construye la alerta de un KPI que cruzó a `go`/`kill`. */
  private aAlerta(ideaId: string, kpi: KpiCalculado): Partial<AlertaKpi> {
    const esGo = kpi.zona === 'go';
    return {
      ideaId,
      kpi: kpi.kpi,
      tipo: esGo ? 'go' : 'kill',
      valor: kpi.valor ?? 0,
      umbral: esGo ? kpi.umbralGo : (kpi.umbralKill ?? 0),
      leida: false,
    };
  }

  /**
   * Lista las alertas de una idea propia, paginadas (recientes primero), con
   * filtro opcional por `leida`. Idea ajena → 403; inexistente → 404.
   */
  async listar(
    ownerId: string,
    ideaId: string,
    query: ListarAlertasQuery,
  ): Promise<RespuestaPaginada<AlertaKpiRespuesta>> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const where = {
      ideaId,
      ...(query.leida !== undefined ? { leida: query.leida } : {}),
    };
    const [alertas, total] = await this.alertas.findAndCount({
      where,
      order: { fechaCreacion: 'DESC' },
      skip: (query.pagina - 1) * query.porPagina,
      take: query.porPagina,
    });
    return crearRespuestaPaginada(alertas.map(aAlertaDto), total, query);
  }

  /**
   * Marca una alerta propia como leída/no leída. Idea ajena → 403; alerta
   * inexistente en la idea → 404.
   */
  async marcarLeida(
    ownerId: string,
    ideaId: string,
    idAlerta: string,
    leida: boolean,
  ): Promise<AlertaKpiRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const alerta = await this.alertas.findOne({
      where: { id: idAlerta, ideaId },
    });
    if (!alerta) {
      throw new RecursoNoEncontradoException(
        'La alerta solicitada no existe en esta idea.',
      );
    }
    alerta.leida = leida;
    return aAlertaDto(await this.alertas.save(alerta));
  }
}
