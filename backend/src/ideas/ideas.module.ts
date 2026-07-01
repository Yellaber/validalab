import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Idea } from './idea.entity';
import { IdeasController } from './ideas.controller';
import { IdeasService } from './ideas.service';

/**
 * Módulo de dominio `ideas` (épica E1): portafolio de ideas propias con su ciclo
 * de archivado. La `Idea` es la entidad raíz sobre la que E2–E6 colgarán
 * hipótesis, contactos, entrevistas, KPIs y veredictos. Reutiliza la fundación:
 * guard global, `@OwnerId()`, paginación y el sobre `Error`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Idea])],
  controllers: [IdeasController],
  providers: [IdeasService],
})
export class IdeasModule {}
