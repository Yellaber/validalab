import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parsearTtlMs } from '../usuarios/sesion/ttl.util';
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

  /** Configuración de la sesión (refresh token opaco), con el TTL ya en ms. */
  get session(): { refreshTokenTtl: string; refreshTtlMs: number } {
    const refreshTokenTtl = this.config.get('REFRESH_TOKEN_TTL', {
      infer: true,
    });
    return { refreshTokenTtl, refreshTtlMs: parsearTtlMs(refreshTokenTtl) };
  }

  /** Atributos de seguridad de la cookie de refresh. */
  get cookie(): { secure: boolean } {
    return { secure: this.config.get('COOKIE_SECURE', { infer: true }) };
  }

  /** Orígenes permitidos por CORS (con credenciales). Lista no vacía. */
  get corsOrigins(): string[] {
    return this.config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  }

  /**
   * Secreto que autoriza la inicialización del sistema. `undefined` cuando no
   * está configurado, en cuyo caso la inicialización no puede autorizarse y el
   * guard rechaza toda petición.
   */
  get bootstrap(): { token?: string } {
    return { token: this.config.get('BOOTSTRAP_TOKEN', { infer: true }) };
  }

  /** Configuración BYOK: clave de cifrado de las API keys y flag de validación. */
  get byok(): { claveCifrado: string; validarKey: boolean } {
    return {
      claveCifrado: this.config.get('BYOK_CLAVE_CIFRADO', { infer: true }),
      validarKey: this.config.get('BYOK_VALIDAR_KEY', { infer: true }),
    };
  }

  /** Configuración del agente Validador Inteligente (modo y gobierno de ejecución). */
  get agente(): {
    modo: Env['AGENTE_MODO'];
    maxIteraciones: number;
    timeoutMs: number;
    maxReintentos: number;
    versionRubrica: string;
  } {
    return {
      modo: this.config.get('AGENTE_MODO', { infer: true }),
      maxIteraciones: this.config.get('AGENTE_MAX_ITERACIONES', {
        infer: true,
      }),
      timeoutMs: this.config.get('AGENTE_TIMEOUT_MS', { infer: true }),
      maxReintentos: this.config.get('AGENTE_MAX_REINTENTOS', { infer: true }),
      versionRubrica: this.config.get('SCORING_VERSION_RUBRICA', {
        infer: true,
      }),
    };
  }
}
