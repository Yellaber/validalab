import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { IdeasModule } from './ideas/ideas.module';
import { ContactosModule } from './contactos/contactos.module';
import { EntrevistasModule } from './entrevistas/entrevistas.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { AgenteModule } from './agente/agente.module';
import { KpisModule } from './kpis/kpis.module';
import { SistemaModule } from './sistema/sistema.module';
import { FiltroDeExcepciones } from './common/errors/filtro-excepciones';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    UsuariosModule,
    IdeasModule,
    ContactosModule,
    EntrevistasModule,
    ProveedoresModule,
    AgenteModule,
    KpisModule,
    SistemaModule,
  ],
  controllers: [],
  providers: [
    // Filtro global: normaliza toda excepción al sobre `Error` del contrato.
    { provide: APP_FILTER, useClass: FiltroDeExcepciones },
    // Validación global: todo DTO declarado con `createZodDto` se valida con su
    // esquema Zod. La entrada inválida lanza `ZodValidationException`, que el
    // filtro global traduce al sobre `Error` con código `VALIDACION_FALLIDA`.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
