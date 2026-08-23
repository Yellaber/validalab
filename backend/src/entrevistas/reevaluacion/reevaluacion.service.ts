import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EjecucionAgente } from '../../agente/ejecucion/ejecucion-agente.entity';
import { AgenteService } from '../../agente/scoring/agente.service';
import { calcularHashScoring } from '../../agente/scoring/hash-scoring';
import {
  ConflictoException,
  ProveedorNoDisponibleException,
} from '../../common/errors/dominio.exception';
import { AppConfigService } from '../../config/app-config.service';
import { IdeasService } from '../../ideas/idea/ideas.service';
import { ConfiguracionService } from '../../proveedores/configuracion/configuracion.service';
import { PrecioModelo } from '../../proveedores/precios/precio-modelo.entity';
import { costoDe } from '../../proveedores/precios/precio.util';
import { PreciosService } from '../../proveedores/precios/precios.service';
import { ACLARACION_COSTO } from '../../proveedores/precios/precios-respuesta';
import { Entrevista } from '../entrevista/entrevista.entity';
import {
  EstimacionReevaluacion,
  ResultadoReevaluacion,
} from './reevaluacion-respuesta';

/**
 * Re-evaluación en lote de las entrevistas de una idea tras un cambio de rúbrica
 * (E8b, RF-22h). Estima el costo SIN ejecutar y ejecuta el lote de forma síncrona,
 * omitiendo por idempotencia (RF-22c). Reutiliza `AgenteService.reevaluar`
 * (scoring síncrono), la tabla de precios (E8a) y el ledger de ejecuciones.
 */
@Injectable()
export class ReevaluacionService {
  constructor(
    @InjectRepository(Entrevista)
    private readonly entrevistas: Repository<Entrevista>,
    @InjectRepository(EjecucionAgente)
    private readonly ejecuciones: Repository<EjecucionAgente>,
    private readonly agente: AgenteService,
    private readonly ideas: IdeasService,
    private readonly configuracion: ConfiguracionService,
    private readonly precios: PreciosService,
    private readonly config: AppConfigService,
  ) {}

  /** Estima el costo de re-evaluar las afectadas, SIN ejecutar. Ajena → 403; inexistente → 404. */
  async estimar(
    ownerId: string,
    ideaId: string,
  ): Promise<EstimacionReevaluacion> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const afectadas = await this.afectadas(ideaId);
    const credencial = await this.configuracion.credencialPara(
      ownerId,
      'scoring',
    );
    const { promedioEntrada, promedioSalida } =
      await this.promedioTokens(ownerId);
    const tokensEntradaEstimados = Math.round(
      promedioEntrada * afectadas.length,
    );
    const tokensSalidaEstimados = Math.round(promedioSalida * afectadas.length);

    const mapa = await this.precios.mapaVigente();
    const costoEstimado = credencial
      ? this.costo(
          credencial.proveedor,
          credencial.modelo,
          tokensEntradaEstimados,
          tokensSalidaEstimados,
          mapa,
        )
      : 0;

    return {
      entrevistasAfectadas: afectadas.length,
      modeloScoring: credencial?.modelo ?? null,
      moneda: 'USD',
      costoEstimado,
      tokensEntradaEstimados,
      tokensSalidaEstimados,
      esEstimado: true,
      aclaracion: ACLARACION_COSTO,
    };
  }

  /**
   * Re-evalúa en lote (síncrono) las afectadas (o el subconjunto `idsEntrevistas`),
   * omitiendo por idempotencia. Sin BYOK → 409; proveedor caído → 503.
   */
  async ejecutar(
    ownerId: string,
    ideaId: string,
    idsEntrevistas?: string[],
  ): Promise<ResultadoReevaluacion> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const objetivo =
      idsEntrevistas && idsEntrevistas.length > 0
        ? await this.entrevistas.find({
            where: { ideaId, id: In(idsEntrevistas) },
          })
        : await this.afectadas(ideaId);

    let entrevistasReevaluadas = 0;
    let entrevistasOmitidas = 0;
    let tokensEntrada = 0;
    let tokensSalida = 0;
    for (const entrevista of objetivo) {
      const resultado = await this.reevaluarUna(ownerId, entrevista);
      if (resultado.reevaluada) {
        entrevistasReevaluadas += 1;
        tokensEntrada += resultado.tokensEntrada;
        tokensSalida += resultado.tokensSalida;
      } else {
        entrevistasOmitidas += 1;
      }
    }

    const credencial = await this.configuracion.credencialPara(
      ownerId,
      'scoring',
    );
    const mapa = await this.precios.mapaVigente();
    const costoEstimado = credencial
      ? this.costo(
          credencial.proveedor,
          credencial.modelo,
          tokensEntrada,
          tokensSalida,
          mapa,
        )
      : 0;

    return {
      entrevistasReevaluadas,
      entrevistasOmitidas,
      moneda: 'USD',
      costoEstimado,
      tokensEntrada,
      tokensSalida,
    };
  }

  /** Delega en el scoring síncrono, mapeando los errores del lote (409 / 503). */
  private async reevaluarUna(
    ownerId: string,
    entrevista: Entrevista,
  ): Promise<{
    reevaluada: boolean;
    tokensEntrada: number;
    tokensSalida: number;
  }> {
    try {
      return await this.agente.reevaluar(ownerId, entrevista);
    } catch (error) {
      if (error instanceof ConflictoException) {
        throw error; // sin BYOK → 409
      }
      throw new ProveedorNoDisponibleException(
        'El proveedor de IA no respondió durante la re-evaluación en lote.',
      );
    }
  }

  /**
   * Entrevistas afectadas por un cambio de rúbrica: `puntuada` cuyo `hashEntrada`
   * ya no coincide con el hash vigente (respuestas + versión de rúbrica actual).
   */
  private async afectadas(ideaId: string): Promise<Entrevista[]> {
    const { versionRubrica } = this.config.agente;
    const puntuadas = await this.entrevistas.find({
      where: { ideaId, estadoScoring: 'puntuada' },
    });
    return puntuadas.filter(
      (e) =>
        e.score?.hashEntrada !==
        calcularHashScoring(e.respuestas, versionRubrica),
    );
  }

  /** Promedio de tokens de los scorings reales exitosos del usuario (histórico). */
  private async promedioTokens(
    ownerId: string,
  ): Promise<{ promedioEntrada: number; promedioSalida: number }> {
    const historicos = await this.ejecuciones.find({
      where: { ownerId, tarea: 'scoring', estado: 'exitosa' },
    });
    const conTokens = historicos.filter((e) => e.tokensEntrada != null);
    if (conTokens.length === 0) {
      return { promedioEntrada: 0, promedioSalida: 0 };
    }
    const sumaEntrada = conTokens.reduce(
      (s, e) => s + (e.tokensEntrada ?? 0),
      0,
    );
    const sumaSalida = conTokens.reduce((s, e) => s + (e.tokensSalida ?? 0), 0);
    return {
      promedioEntrada: sumaEntrada / conTokens.length,
      promedioSalida: sumaSalida / conTokens.length,
    };
  }

  /** Costo del lote: delega la fórmula en `PreciosService`. Sin precio catalogado → 0. */
  private costo(
    proveedor: string,
    modelo: string,
    tokensEntrada: number,
    tokensSalida: number,
    mapa: Map<string, PrecioModelo>,
  ): number {
    const precio = mapa.get(`${proveedor}|${modelo}`);
    if (!precio) {
      return 0;
    }
    return costoDe(precio, tokensEntrada, tokensSalida);
  }
}
