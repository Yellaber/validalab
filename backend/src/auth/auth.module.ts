import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Módulo de autenticación. Configura el `JwtModule` para FIRMAR y VERIFICAR el
 * `accessToken` con el secreto y TTL de la configuración, y registra el
 * `JwtAuthGuard` como guard global (`APP_GUARD`), de modo que toda ruta exige
 * token salvo las marcadas con `@Publico()`.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwt.accessSecret,
        // El TTL es un string de configuración (p. ej. "15m"); se castea al
        // tipo `expiresIn` de jsonwebtoken (number | StringValue).
        signOptions: {
          expiresIn: config.jwt.accessTtl as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [JwtModule],
})
export class AuthModule {}
