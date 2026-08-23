import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EjecucionAgente } from '../agente/ejecucion/ejecucion-agente.entity';
import { AgenteModule } from '../agente/agente.module';
import { ContactosModule } from '../contactos/contactos.module';
import { IdeasModule } from '../ideas/ideas.module';
import { ProveedoresModule } from '../proveedores/proveedores.module';
import { Entrevista } from './entrevista/entrevista.entity';
import { EntrevistasController } from './entrevista/entrevistas.controller';
import { EntrevistasService } from './entrevista/entrevistas.service';
import { Guion } from './guion/guion.entity';
import { GuionesController } from './guion/guiones.controller';
import { GuionesService } from './guion/guiones.service';
import { ReevaluacionController } from './reevaluacion/reevaluacion.controller';
import { ReevaluacionService } from './reevaluacion/reevaluacion.service';

/**
 * Módulo de dominio `entrevistas`, con sub-dominios:
 * - `guion/`: el guión de entrevista reutilizable.
 * - `entrevista/`: el registro de entrevistas (dispara el scoring, E4).
 * - `reevaluacion/`: la re-evaluación en lote tras un cambio de rúbrica (E8b),
 *   que reutiliza `AgenteService` (scoring síncrono), `ProveedoresModule`
 *   (precios + config BYOK) y el ledger `ejecuciones_agente` (promedio de tokens).
 *
 * Depende de `ideas` y `contactos`; importa `AgenteModule` (scoring) y
 * `ProveedoresModule` (E8b). Reutiliza la fundación: guard global, `@OwnerId()`,
 * paginación y el sobre `Error`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Guion, Entrevista, EjecucionAgente]),
    IdeasModule,
    ContactosModule,
    AgenteModule,
    ProveedoresModule,
  ],
  controllers: [
    GuionesController,
    EntrevistasController,
    ReevaluacionController,
  ],
  providers: [GuionesService, EntrevistasService, ReevaluacionService],
})
export class EntrevistasModule {}
