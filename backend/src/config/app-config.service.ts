import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './env.schema';

/**
 * Acceso tipado a la configuración del entorno. Es la ÚNICA vía por la que el
 * resto del backend lee la configuración: ningún módulo de dominio debe leer
 * `process.env` directamente. Los valores ya vienen validados y con su tipo
 * final (p. ej. `PORT` es number, `DB_SYNCHRONIZE` es boolean).
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  /** Parámetros de conexión a PostgreSQL para TypeORM. */
  get database(): {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
  } {
    return {
      host: this.config.get('DB_HOST', { infer: true }),
      port: this.config.get('DB_PORT', { infer: true }),
      username: this.config.get('DB_USERNAME', { infer: true }),
      password: this.config.get('DB_PASSWORD', { infer: true }),
      database: this.config.get('DB_DATABASE', { infer: true }),
      synchronize: this.config.get('DB_SYNCHRONIZE', { infer: true }),
    };
  }

  /** Secreto y TTL para firmar y verificar el `accessToken`. */
  get jwt(): { accessSecret: string; accessTtl: string } {
    return {
      accessSecret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      accessTtl: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    };
  }

  /** Configuración de la sesión (refresh token opaco). */
  get session(): { refreshTokenTtl: string } {
    return {
      refreshTokenTtl: this.config.get('REFRESH_TOKEN_TTL', { infer: true }),
    };
  }
}
