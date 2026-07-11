import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgenteModule } from '../agente/agente.module';
import { ContactosModule } from '../contactos/contactos.module';
import { IdeasModule } from '../ideas/ideas.module';
import { Entrevista } from './entrevista/entrevista.entity';
import { EntrevistasController } from './entrevista/entrevistas.controller';
import { EntrevistasService } from './entrevista/entrevistas.service';
import { Guion } from './guion/guion.entity';
import { GuionesController } from './guion/guiones.controller';
import { GuionesService } from './guion/guiones.service';

/**
 * Módulo de dominio `entrevistas` (épica E4), con dos sub-dominios:
 * - `guion/`: el guión de entrevista reutilizable (recurso de usuario).
 * - `entrevista/`: el registro de entrevistas vinculadas a idea+contacto+guión,
 *   que mueve el contacto a `entrevistado`.
 *
 * Depende de `ideas` (asegurarPropia) y `contactos` (validar el contacto de la
 * idea + marcarlo `entrevistado`), importados vía sus módulos; el guión se
 * reutiliza dentro del propio módulo. Importa `AgenteModule` para disparar el
 * scoring por IA de forma asíncrona al guardar/editar respuestas (E4-C).
 * Reutiliza la fundación: guard global, `@OwnerId()`, paginación y el sobre `Error`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Guion, Entrevista]),
    IdeasModule,
    ContactosModule,
    AgenteModule,
  ],
  controllers: [GuionesController, EntrevistasController],
  providers: [GuionesService, EntrevistasService],
})
export class EntrevistasModule {}
