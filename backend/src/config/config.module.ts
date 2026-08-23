import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { validateEnv } from './env.schema';

/**
 * Módulo global de configuración. Carga el `.env`, valida el entorno con Zod al
 * arrancar (fail-fast vía `validate`) y expone `AppConfigService` para acceso
 * tipado en toda la aplicación.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
