import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdeasModule } from '../ideas/ideas.module';
import { Contacto } from './contacto.entity';
import { ContactosController } from './contactos.controller';
import { ContactosService } from './contactos.service';

/**
 * Módulo de dominio `contactos` (épica E3): CRM de contactos y embudo de
 * outreach por idea. Es un contexto acotado **separado** que depende de `ideas`:
 * importa `IdeasModule` para reutilizar `IdeasService.asegurarPropia` y heredar
 * el aislamiento de la idea (403/404), sin fusionar los módulos. Reutiliza la
 * fundación: guard global, `@OwnerId()`, paginación y el sobre `Error`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Contacto]), IdeasModule],
  controllers: [ContactosController],
  providers: [ContactosService],
  // Se exporta para que el módulo `entrevistas` valide el vínculo del contacto
  // con la idea y lo marque `entrevistado` al registrar una entrevista (E4).
  exports: [ContactosService],
})
export class ContactosModule {}
