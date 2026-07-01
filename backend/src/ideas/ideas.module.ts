import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hipotesis } from './hipotesis/hipotesis.entity';
import { HipotesisController } from './hipotesis/hipotesis.controller';
import { HipotesisService } from './hipotesis/hipotesis.service';
import { Idea } from './idea/idea.entity';
import { IdeasController } from './idea/ideas.controller';
import { IdeasService } from './idea/ideas.service';
import { UmbralIdea } from './umbral/umbral.entity';
import { UmbralesController } from './umbral/umbrales.controller';
import { UmbralesService } from './umbral/umbrales.service';

/**
 * Módulo de dominio `ideas` (épicas E1–E2): portafolio de ideas propias con su
 * ciclo de archivado, las hipótesis tipificadas y los umbrales kill/go que
 * cuelgan de cada idea. La `Idea` es la entidad raíz sobre la que E2–E6 colgarán
 * hipótesis, contactos, entrevistas, KPIs y veredictos. `HipotesisService` y
 * `UmbralesService` reutilizan `IdeasService` para heredar la verificación de
 * idea propia (403/404). Reutiliza la fundación: guard global, `@OwnerId()`,
 * paginación y el sobre `Error`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Idea, Hipotesis, UmbralIdea])],
  controllers: [IdeasController, HipotesisController, UmbralesController],
  providers: [IdeasService, HipotesisService, UmbralesService],
})
export class IdeasModule {}
