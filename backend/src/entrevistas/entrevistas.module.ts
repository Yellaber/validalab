import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guion } from './guion/guion.entity';
import { GuionesController } from './guion/guiones.controller';
import { GuionesService } from './guion/guiones.service';

/**
 * Módulo de dominio `entrevistas` (épica E4). Estrenado con el sub-dominio
 * `guion/`: el guión de entrevista reutilizable entre ideas (recurso de nivel de
 * usuario, aislado por `owner_id`). Los siguientes chunks añadirán el sub-dominio
 * `entrevista/` (registro + scoring por IA). Reutiliza la fundación: guard
 * global, `@OwnerId()`, paginación y el sobre `Error`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Guion])],
  controllers: [GuionesController],
  providers: [GuionesService],
})
export class EntrevistasModule {}
