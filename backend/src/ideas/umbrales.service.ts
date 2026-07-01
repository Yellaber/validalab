import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RecursoNoEncontradoException,
  ValidacionFallidaException,
} from '../common/errors/dominio.exception';
import { esKpiValido, Kpi, KPIS } from './kpi.catalog';
import { aUmbralDto, UmbralRespuesta } from './umbral-respuesta';
import { UmbralIdea } from './umbral.entity';
import { ActualizarUmbralDto } from './umbrales.dto';
import { IdeasService } from './ideas.service';

@Injectable()
export class UmbralesService {
  constructor(
    @InjectRepository(UmbralIdea)
    private readonly umbrales: Repository<UmbralIdea>,
    private readonly ideas: IdeasService,
  ) {}

  /**
   * Devuelve el conjunto completo de umbrales de una idea propia: un `Umbral`
   * por cada KPI del catálogo, con el override de la idea si existe o el valor
   * por defecto si no. Idea ajena → 403; inexistente → 404.
   */
  async listar(ownerId: string, ideaId: string): Promise<UmbralRespuesta[]> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const overrides = await this.umbrales.find({ where: { ideaId } });
    const porKpi = new Map(
      overrides.map((override) => [override.kpi, override]),
    );
    return KPIS.map((kpi) => aUmbralDto(kpi, porKpi.get(kpi)));
  }

  /**
   * Fija (upsert idempotente) el umbral de un KPI para una idea propia y
   * devuelve el `Umbral` resultante. Idea ajena → 403; idea inexistente → 404;
   * `kpi` fuera del catálogo → 404; `umbralKill` mayor que `umbralGo` → 422.
   */
  async fijar(
    ownerId: string,
    ideaId: string,
    kpi: string,
    datos: ActualizarUmbralDto,
  ): Promise<UmbralRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);

    if (!esKpiValido(kpi)) {
      throw new RecursoNoEncontradoException(
        'El KPI indicado no existe en el catálogo.',
      );
    }

    const umbralKill = datos.umbralKill ?? null;
    if (umbralKill !== null && umbralKill > datos.umbralGo) {
      throw new ValidacionFallidaException(
        'El umbral kill no puede ser mayor que el umbral go.',
        [
          {
            campo: 'umbralKill',
            problema: 'Debe ser menor o igual a umbralGo.',
          },
        ],
      );
    }

    const override = await this.upsert(ideaId, kpi, datos.umbralGo, umbralKill);
    return aUmbralDto(kpi, override);
  }

  /**
   * Inserta o actualiza el override de `(ideaId, kpi)`. La unicidad garantiza
   * que repetir la operación con los mismos valores deje el mismo estado.
   */
  private async upsert(
    ideaId: string,
    kpi: Kpi,
    umbralGo: number,
    umbralKill: number | null,
  ): Promise<UmbralIdea> {
    const existente = await this.umbrales.findOne({ where: { ideaId, kpi } });
    const override = existente ?? this.umbrales.create({ ideaId, kpi });
    override.umbralGo = umbralGo;
    override.umbralKill = umbralKill;
    return this.umbrales.save(override);
  }
}
