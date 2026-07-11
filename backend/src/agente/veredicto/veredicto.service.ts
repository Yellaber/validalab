import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictoException,
  ProveedorNoDisponibleException,
  RecursoNoEncontradoException,
  SalidaAgenteInvalidaException,
  ValidacionFallidaException,
} from '../../common/errors/dominio.exception';
import {
  crearRespuestaPaginada,
  RespuestaPaginada,
} from '../../common/pagination/respuesta-paginada';
import { IdeasService } from '../../ideas/idea/ideas.service';
import { HipotesisService } from '../../ideas/hipotesis/hipotesis.service';
import { UmbralesService } from '../../ideas/umbral/umbrales.service';
import { TableroIdea } from '../../kpis/tablero/kpis-respuesta';
import { KpisService } from '../../kpis/tablero/kpis.service';
import { AppConfigService } from '../../config/app-config.service';
import { ejecutarAgente } from '../comun/ejecutar-agente';
import { ModeloDeChatFactory } from '../proveedor/modelo-chat.factory';
import { salidaVeredictoSchema, SalidaVeredicto } from './esquema-veredicto';
import { humanVeredicto, SYSTEM_VEREDICTO } from './prompt-veredicto';
import { crearToolsVeredicto } from './tools-veredicto';
import { Veredicto } from './veredicto.entity';
import { aVeredictoDto, VeredictoRespuesta } from './veredicto-respuesta';
import { VerificarVeredictoDto, ListarVeredictosQuery } from './veredicto.dto';

/** Salida de un intento de veredicto (real o fake) antes de persistir. */
interface EmisionVeredicto {
  salida: SalidaVeredicto;
  proveedor: string;
  modelo: string;
}

/**
 * El Validador Inteligente para el veredicto de idea (SRS §8, RF-14/15/16), la
 * segunda función del agente. Emite bajo demanda (síncrono), congela el snapshot
 * de KPIs para reproducibilidad (RNF-09), y gobierna la verificación consultiva:
 * la idea solo cambia de estado tras aprobación humana.
 */
@Injectable()
export class VeredictoService {
  constructor(
    @InjectRepository(Veredicto)
    private readonly veredictos: Repository<Veredicto>,
    private readonly kpis: KpisService,
    private readonly factory: ModeloDeChatFactory,
    private readonly hipotesis: HipotesisService,
    private readonly umbrales: UmbralesService,
    private readonly ideas: IdeasService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Emite un veredicto sobre una idea propia: calcula y congela el snapshot de
   * KPIs, invoca al agente (real o `fake`) con el modelo de veredicto de la config
   * BYOK, valida la salida y persiste el veredicto `pendiente`. Sin BYOK → 409;
   * salida inválida tras reintentos → 502; proveedor no disponible → 503; idea
   * ajena → 403; inexistente → 404.
   */
  async emitir(ownerId: string, ideaId: string): Promise<VeredictoRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const snapshot = await this.kpis.calcularTablero(ownerId, ideaId);
    const emision =
      this.config.agente.modo === 'fake'
        ? this.emitirFake(snapshot)
        : await this.emitirReal(ownerId, ideaId, snapshot);

    const veredicto = this.veredictos.create({
      ideaId,
      veredicto: emision.salida.veredicto,
      confianza: emision.salida.confianza,
      justificacionPorKPI: emision.salida.justificacionPorKPI,
      recomendaciones: emision.salida.recomendaciones,
      proveedor: emision.proveedor,
      modelo: emision.modelo,
      snapshotKpis: snapshot.kpis,
      estadoVerificacion: 'pendiente',
      verificacion: null,
    });
    return aVeredictoDto(await this.veredictos.save(veredicto));
  }

  /** Invoca al agente real contra el proveedor BYOK; mapea los errores a 409/502/503. */
  private async emitirReal(
    ownerId: string,
    ideaId: string,
    snapshot: TableroIdea,
  ): Promise<EmisionVeredicto> {
    const { modelo, proveedor, nombreModelo } = await this.factory.crear(
      ownerId,
      'veredicto',
    );
    const tools = crearToolsVeredicto(
      { hipotesis: this.hipotesis, umbrales: this.umbrales },
      { ownerId, ideaId, snapshot },
    );
    const { maxIteraciones, maxReintentos, timeoutMs } = this.config.agente;
    try {
      const resultado = await ejecutarAgente({
        modelo,
        tools,
        system: SYSTEM_VEREDICTO,
        human: humanVeredicto(snapshot),
        esquema: salidaVeredictoSchema,
        nombreSalida: 'VeredictoIdea',
        maxIteraciones,
        maxReintentos,
        timeoutMs,
      });
      return { salida: resultado.salida, proveedor, modelo: nombreModelo };
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error);
      if (/no produjo una salida válida/.test(motivo)) {
        throw new SalidaAgenteInvalidaException();
      }
      throw new ProveedorNoDisponibleException(
        'El proveedor de IA no respondió al emitir el veredicto.',
      );
    }
  }

  /**
   * Modo `fake`: veredicto determinista derivado del semáforo del snapshot, sin
   * proveedor ni red. Más KPIs en kill que en go → `kill`; más en go → `go`;
   * empate/mixto → `pivote`. La confianza baja con la proporción de KPIs sin datos.
   */
  private emitirFake(snapshot: TableroIdea): EmisionVeredicto {
    const r = snapshot.resumen;
    const veredicto =
      r.enZonaKill > r.enZonaGo
        ? 'kill'
        : r.enZonaGo > r.enZonaKill
          ? 'go'
          : 'pivote';
    const conDatos = r.totalKpis - r.sinDatos;
    const confianza =
      r.totalKpis > 0 ? Math.round((conDatos / r.totalKpis) * 100) : 0;
    return {
      salida: {
        veredicto,
        confianza,
        justificacionPorKPI: snapshot.kpis.map((k) => ({
          kpi: k.kpi,
          lectura: `Zona ${k.zona} (valor ${k.valor ?? 'sin datos'} frente a go ${k.umbralGo}).`,
        })),
        recomendaciones: [
          `Veredicto simulado (modo fake) derivado del semáforo: ${r.enZonaGo} en go, ${r.enZonaKill} en kill, ${r.sinDatos} sin datos.`,
        ],
      },
      proveedor: 'fake',
      modelo: 'fake',
    };
  }

  /** Historial paginado de veredictos de una idea propia (recientes primero). */
  async listar(
    ownerId: string,
    ideaId: string,
    query: ListarVeredictosQuery,
  ): Promise<RespuestaPaginada<VeredictoRespuesta>> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const [veredictos, total] = await this.veredictos.findAndCount({
      where: { ideaId },
      order: { fechaEmision: 'DESC' },
      skip: (query.pagina - 1) * query.porPagina,
      take: query.porPagina,
    });
    return crearRespuestaPaginada(veredictos.map(aVeredictoDto), total, query);
  }

  /** Devuelve un veredicto propio. Idea/veredicto ajeno → 403; inexistente → 404. */
  async obtener(
    ownerId: string,
    ideaId: string,
    idVeredicto: string,
  ): Promise<VeredictoRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    return aVeredictoDto(await this.buscarEnIdea(ideaId, idVeredicto));
  }

  /**
   * Verifica un veredicto `pendiente` (modo consultivo). Aprobar → firme + fija el
   * estado de la idea; anular → exige nota y no toca la idea. Conserva el bloque
   * del agente. Ya verificado → 409; idea/veredicto ajeno → 403; inexistente → 404.
   */
  async verificar(
    ownerId: string,
    ideaId: string,
    idVeredicto: string,
    datos: VerificarVeredictoDto,
  ): Promise<VeredictoRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const veredicto = await this.buscarEnIdea(ideaId, idVeredicto);
    if (veredicto.estadoVerificacion !== 'pendiente') {
      throw new ConflictoException('El veredicto ya fue verificado.');
    }
    if (datos.resultado === 'anulado' && !datos.nota) {
      throw new ValidacionFallidaException(
        'La nota es obligatoria al anular un veredicto.',
        [
          {
            campo: 'nota',
            problema: 'Requerida cuando el resultado es anulado.',
          },
        ],
      );
    }

    veredicto.verificacion = {
      resultado: datos.resultado,
      nota: datos.nota,
      fecha: new Date().toISOString(),
    };
    veredicto.estadoVerificacion = datos.resultado;
    if (datos.resultado === 'aprobado') {
      // Único camino legítimo para fijar go/pivote/kill en la idea.
      await this.ideas.fijarEstadoPorVeredicto(
        ownerId,
        ideaId,
        veredicto.veredicto,
      );
    }
    return aVeredictoDto(await this.veredictos.save(veredicto));
  }

  /** Carga un veredicto exigiendo que pertenezca a la idea. Inexistente → 404. */
  private async buscarEnIdea(
    ideaId: string,
    idVeredicto: string,
  ): Promise<Veredicto> {
    const veredicto = await this.veredictos.findOne({
      where: { id: idVeredicto, ideaId },
    });
    if (!veredicto) {
      throw new RecursoNoEncontradoException(
        'El veredicto solicitado no existe en esta idea.',
      );
    }
    return veredicto;
  }
}
