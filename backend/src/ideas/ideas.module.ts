import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hipotesis } from './hipotesis.entity';
import { HipotesisController } from './hipotesis.controller';
import { HipotesisService } from './hipotesis.service';
import { Idea } from './idea.entity';
import { IdeasController } from './ideas.controller';
import { IdeasService } from './ideas.service';

/**
 * Módulo de dominio `ideas` (épicas E1–E2): portafolio de ideas propias con su
 * ciclo de archivado, y las hipótesis tipificadas que cuelgan de cada idea. La
 * `Idea` es la entidad raíz sobre la que E2–E6 colgarán hipótesis, contactos,
 * entrevistas, KPIs y veredictos. `HipotesisService` reutiliza `IdeasService`
 * para heredar la verificación de idea propia (403/404). Reutiliza la fundación:
 * guard global, `@OwnerId()`, paginación y el sobre `Error`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Idea, Hipotesis])],
  controllers: [IdeasController, HipotesisController],
  providers: [IdeasService, HipotesisService],
})
export class IdeasModule {}
