import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contacto } from '../contactos/contacto.entity';
import { Entrevista } from '../entrevistas/entrevista/entrevista.entity';
import { IdeasModule } from '../ideas/ideas.module';
import { KpisController } from './kpis.controller';
import { KpisService } from './kpis.service';

/**
 * Módulo de dominio `kpis` (E5): el tablero de decisión. Calcula los 14 KPIs de
 * una idea al vuelo desde sus entrevistas y contactos (reconstruible, RNF-15).
 * Consume el repo de `Entrevista` y `Contacto` DIRECTAMENTE (solo lectura) e
 * importa `IdeasModule` para el aislamiento (`IdeasService`) y los umbrales
 * vigentes (`UmbralesService`). Reutiliza la fundación: guard global, `@OwnerId()`
 * y el sobre `Error`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Entrevista, Contacto]), IdeasModule],
  controllers: [KpisController],
  providers: [KpisService],
})
export class KpisModule {}
