import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contacto } from '../contactos/contacto.entity';
import { Entrevista } from '../entrevistas/entrevista/entrevista.entity';
import { IdeasModule } from '../ideas/ideas.module';
import { AlertaKpi } from './alertas/alerta-kpi.entity';
import { AlertasController } from './alertas/alertas.controller';
import { AlertasService } from './alertas/alertas.service';
import { EstadoSemaforoKpi } from './alertas/estado-semaforo-kpi.entity';
import { KpisController } from './tablero/kpis.controller';
import { KpisService } from './tablero/kpis.service';

/**
 * Módulo de dominio `kpis` (E5), con dos sub-dominios:
 * - `tablero/`: el cálculo al vuelo de los 14 KPIs de una idea (reconstruible,
 *   RNF-15) expuesto en `GET /ideas/{id}/kpis`.
 * - `alertas/`: la generación dirigida por evento de alertas de cruce de umbral
 *   (tras un scoring) y su consulta. `zona-kpi` es el tipo compartido en la raíz.
 *
 * Consume los repos de `Entrevista`/`Contacto` (solo lectura) e importa
 * `IdeasModule` (aislamiento + umbrales vigentes). Exporta `AlertasService` para
 * que la capa agéntica dispare la evaluación al completar un scoring.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Entrevista,
      Contacto,
      AlertaKpi,
      EstadoSemaforoKpi,
    ]),
    IdeasModule,
  ],
  controllers: [KpisController, AlertasController],
  providers: [KpisService, AlertasService],
  // `AlertasService` para el disparo desde el agente (E5b); `KpisService` para
  // que el veredicto (E6) calcule el snapshot de KPIs congelado.
  exports: [AlertasService, KpisService],
})
export class KpisModule {}
