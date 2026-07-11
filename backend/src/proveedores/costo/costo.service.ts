import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EjecucionAgente } from '../../agente/ejecucion/ejecucion-agente.entity';
import { Idea } from '../../ideas/idea/idea.entity';
import { IdeasService } from '../../ideas/idea/ideas.service';
import { ProveedorId } from '../catalogo/proveedor.types';
import { PrecioModelo } from '../precios/precio-modelo.entity';
import { costoDe } from '../precios/precio.util';
import { PreciosService } from '../precios/precios.service';
import { ACLARACION_COSTO } from '../precios/precios-respuesta';
import {
  CostoIdea,
  CostoIdeaResumen,
  CostoUsuario,
  DesgloseCostoTarea,
  tareaCostoSchema,
} from './costo-respuesta';

/** Enlace al panel de facturación por proveedor (RF-22g). Dato de plataforma, no un modelo. */
const URL_FACTURACION: Record<ProveedorId, string> = {
  anthropic: 'https://console.anthropic.com/settings/billing',
  openai: 'https://platform.openai.com/account/billing',
  google: 'https://console.cloud.google.com/billing',
};

const TAREAS = tareaCostoSchema.options;

/**
 * Motor del costo estimado (E8, RF-22f). Calcula al vuelo, desde el ledger único
 * `ejecuciones_agente` × la tabla de precios, el costo acumulado de una idea
 * (desglose por tarea) y del usuario (desglose por idea). Cuenta TODAS las
 * ejecuciones exitosas (incluidos re-scorings superados). Es un estimado del
 * consumo vía ValidaLab, no el saldo (RNF-17).
 */
@Injectable()
export class CostoService {
  constructor(
    @InjectRepository(EjecucionAgente)
    private readonly ejecuciones: Repository<EjecucionAgente>,
    @InjectRepository(Idea)
    private readonly ideas: Repository<Idea>,
    private readonly ideasService: IdeasService,
    private readonly precios: PreciosService,
  ) {}

  /** Costo estimado de una idea propia, con desglose por tarea. Ajena → 403; inexistente → 404. */
  async costoIdea(ownerId: string, ideaId: string): Promise<CostoIdea> {
    await this.ideasService.asegurarPropia(ownerId, ideaId);
    const ejecuciones = await this.ejecuciones.find({
      where: { ownerId, ideaId, estado: 'exitosa' },
    });
    const mapa = await this.precios.mapaVigente();

    const desglosePorTarea = TAREAS.map((tarea) =>
      this.desglosarTarea(
        tarea,
        ejecuciones.filter((e) => e.tarea === tarea),
        mapa,
      ),
    );
    const total = desglosePorTarea.reduce((s, d) => s + d.costoEstimado, 0);
    const proveedor = this.proveedorDe(ejecuciones);

    return {
      ideaId,
      proveedor,
      moneda: 'USD',
      costoEstimadoTotal: total,
      desglosePorTarea,
      tokensEntrada: desglosePorTarea.reduce((s, d) => s + d.tokensEntrada, 0),
      tokensSalida: desglosePorTarea.reduce((s, d) => s + d.tokensSalida, 0),
      llamadas: desglosePorTarea.reduce((s, d) => s + d.llamadas, 0),
      esEstimado: true,
      aclaracion: ACLARACION_COSTO,
      urlFacturacion: proveedor ? URL_FACTURACION[proveedor] : null,
      fechaCalculo: new Date().toISOString(),
    };
  }

  /** Costo estimado total del usuario, con desglose por idea (identificada por su título). */
  async costoUsuario(ownerId: string): Promise<CostoUsuario> {
    const ejecuciones = await this.ejecuciones.find({
      where: { ownerId, estado: 'exitosa' },
    });
    const mapa = await this.precios.mapaVigente();

    let total = 0;
    let tokensEntrada = 0;
    let tokensSalida = 0;
    const porIdea = new Map<string, number>();
    for (const e of ejecuciones) {
      const costo = this.costoEjecucion(e, mapa);
      total += costo;
      tokensEntrada += e.tokensEntrada ?? 0;
      tokensSalida += e.tokensSalida ?? 0;
      if (e.ideaId) {
        porIdea.set(e.ideaId, (porIdea.get(e.ideaId) ?? 0) + costo);
      }
    }

    const costoPorIdea = await this.resumirPorIdea(porIdea);
    const proveedor = this.proveedorDe(ejecuciones);
    return {
      moneda: 'USD',
      costoEstimadoTotal: total,
      costoPorIdea,
      proveedor,
      tokensEntrada,
      tokensSalida,
      esEstimado: true,
      aclaracion: ACLARACION_COSTO,
      urlFacturacion: proveedor ? URL_FACTURACION[proveedor] : null,
      fechaCalculo: new Date().toISOString(),
    };
  }

  /** Agrega el costo de las ejecuciones de una tarea. */
  private desglosarTarea(
    tarea: DesgloseCostoTarea['tarea'],
    ejecuciones: EjecucionAgente[],
    mapa: Map<string, PrecioModelo>,
  ): DesgloseCostoTarea {
    return {
      tarea,
      llamadas: ejecuciones.length,
      tokensEntrada: ejecuciones.reduce(
        (s, e) => s + (e.tokensEntrada ?? 0),
        0,
      ),
      tokensSalida: ejecuciones.reduce((s, e) => s + (e.tokensSalida ?? 0), 0),
      costoEstimado: ejecuciones.reduce(
        (s, e) => s + this.costoEjecucion(e, mapa),
        0,
      ),
    };
  }

  /** Costo de una ejecución: delega la fórmula en `PreciosService`. Sin precio → 0. */
  private costoEjecucion(
    e: EjecucionAgente,
    mapa: Map<string, PrecioModelo>,
  ): number {
    const precio = mapa.get(`${e.proveedor}|${e.modelo}`);
    if (!precio) {
      return 0;
    }
    return costoDe(precio, e.tokensEntrada ?? 0, e.tokensSalida ?? 0);
  }

  /** Proveedor real con el que se generó el consumo; ignora `fake`/nulos. */
  private proveedorDe(ejecuciones: EjecucionAgente[]): ProveedorId | null {
    const real = ejecuciones.find((e) => e.proveedor && e.proveedor !== 'fake');
    return (real?.proveedor as ProveedorId) ?? null;
  }

  /** Convierte el costo por idea en el desglose con títulos (recientes primero por costo). */
  private async resumirPorIdea(
    porIdea: Map<string, number>,
  ): Promise<CostoIdeaResumen[]> {
    const ids = [...porIdea.keys()];
    if (ids.length === 0) {
      return [];
    }
    const ideas = await this.ideas.find({ where: { id: In(ids) } });
    const titulo = new Map(ideas.map((i) => [i.id, i.titulo]));
    return ids
      .map((id) => ({
        ideaId: id,
        titulo: titulo.get(id) ?? '(idea eliminada)',
        costoEstimado: porIdea.get(id) ?? 0,
      }))
      .sort((a, b) => b.costoEstimado - a.costoEstimado);
  }
}
