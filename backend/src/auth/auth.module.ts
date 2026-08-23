import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Módulo de autenticación. Configura el `JwtModule` para FIRMAR y VERIFICAR el
 * `accessToken` con el secreto y TTL de la configuración, y registra dos guards
 * globales (`APP_GUARD`) en orden: primero el `JwtAuthGuard` (toda ruta exige
 * token salvo las `@Publico()`), luego el `RolesGuard` (RBAC sobre `@Roles()`),
 * que ya cuenta con la identidad adjuntada por el primero.
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
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
