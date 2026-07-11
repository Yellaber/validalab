import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contacto } from '../contactos/contacto.entity';
import { Entrevista } from '../entrevistas/entrevista/entrevista.entity';
import { IdeasService } from '../ideas/idea/ideas.service';
import { UmbralesService } from '../ideas/umbral/umbrales.service';
import { calcularValoresKpi } from './formulas-kpi';
import { KpiCalculado, resumirTablero, TableroIdea } from './kpis-respuesta';
import { determinarZona } from './zona-kpi';

/**
 * Motor de KPIs (SRS §7, E5). Calcula el tablero de una idea AL VUELO desde sus
 * entrevistas y contactos —sin materializar (reconstruible, RNF-15)— y en una
 * sola pasada dentro del presupuesto de latencia (RNF-02). Reutiliza
 * `IdeasService` (aislamiento) y `UmbralesService` (umbrales vigentes por idea).
 */
@Injectable()
export class KpisService {
  constructor(
    @InjectRepository(Entrevista)
    private readonly entrevistas: Repository<Entrevista>,
    @InjectRepository(Contacto)
    private readonly contactos: Repository<Contacto>,
    private readonly ideas: IdeasService,
    private readonly umbrales: UmbralesService,
  ) {}

  /**
   * Calcula el tablero de una idea propia: los 14 KPIs con su valor, umbrales
   * vigentes y zona de semáforo, más el resumen por zona. Idea ajena → 403;
   * inexistente → 404.
   */
  async calcularTablero(ownerId: string, ideaId: string): Promise<TableroIdea> {
    const idea = await this.ideas.asegurarPropia(ownerId, ideaId);
    const [entrevistas, contactos, umbrales] = await Promise.all([
      this.entrevistas.find({ where: { ideaId } }),
      this.contactos.find({ where: { ideaId } }),
      this.umbrales.listar(ownerId, ideaId),
    ]);

    const valores = calcularValoresKpi({
      entrevistas,
      contactos,
      segmentoBeachhead: idea.segmentoBeachhead ?? null,
      ahora: new Date(),
    });

    // `umbrales` viene en el orden canónico del catálogo (uno por KPI).
    const kpis: KpiCalculado[] = umbrales.map((u) => {
      const r = valores[u.kpi];
      return {
        kpi: u.kpi,
        grupo: u.grupo,
        unidad: u.unidad,
        valor: r.valor,
        numerador: r.numerador,
        denominador: r.denominador,
        umbralGo: u.umbralGo,
        umbralKill: u.umbralKill,
        zona: determinarZona(r.valor, u.umbralGo, u.umbralKill),
      };
    });

    return {
      ideaId,
      fechaCalculo: new Date().toISOString(),
      resumen: resumirTablero(kpis),
      kpis,
    };
  }
}
