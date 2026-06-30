import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claims, Rol } from '../auth/claims';
import { AppConfigService } from '../config/app-config.service';
import { NoAutenticadoException } from '../common/errors/dominio.exception';
import { Sesion } from './sesion.entity';

/** Datos mínimos del usuario necesarios para firmar su accessToken. */
export interface UsuarioParaToken {
  id: string;
  rol: Rol;
}

/**
 * Emisión y ciclo de vida de los tokens de sesión:
 * - accessToken: JWT firmado con claims `{ sub, rol }` (reutiliza el `JwtModule`
 *   de la fundación, ya configurado con secreto y expiración).
 * - refreshToken: token OPACO aleatorio; en BD solo se guarda su hash SHA-256
 *   (determinista → permite búsqueda indexada). Se rota en cada refresh y se
 *   revoca en logout.
 */
@Injectable()
export class ServicioDeTokens {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    @InjectRepository(Sesion)
    private readonly sesiones: Repository<Sesion>,
  ) {}

  /** Firma el accessToken y calcula su vigencia (`expiraEn`) en segundos. */
  firmarAccessToken(usuario: UsuarioParaToken): {
    accessToken: string;
    expiraEn: number;
  } {
    const claims: Claims = { sub: usuario.id, rol: usuario.rol };
    const accessToken = this.jwt.sign(claims);
    const payload = this.jwt.decode<{ iat: number; exp: number }>(accessToken);
    return { accessToken, expiraEn: payload.exp - payload.iat };
  }

  /** Crea una sesión nueva y devuelve el refreshToken en claro (única vez). */
  async emitirRefreshToken(usuarioId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const sesion = this.sesiones.create({
      usuarioId,
      tokenHash: this.hashRefresh(token),
      expiraEn: new Date(Date.now() + this.refreshTtlMs()),
    });
    await this.sesiones.save(sesion);
    return token;
  }

  /**
   * Valida un refreshToken vigente, revoca su sesión (rotación) y emite uno
   * nuevo. Token inexistente, expirado o ya revocado → `NoAutenticadoException`.
   */
  async rotarRefreshToken(
    tokenPlano: string,
  ): Promise<{ usuarioId: string; refreshToken: string }> {
    const sesion = await this.buscarSesionVigente(tokenPlano);
    sesion.revocadoEn = new Date();
    await this.sesiones.save(sesion);
    const refreshToken = await this.emitirRefreshToken(sesion.usuarioId);
    return { usuarioId: sesion.usuarioId, refreshToken };
  }

  /** Revoca la sesión de un refreshToken (logout). Idempotente. */
  async revocarRefreshToken(tokenPlano: string): Promise<void> {
    const sesion = await this.sesiones.findOne({
      where: { tokenHash: this.hashRefresh(tokenPlano) },
    });
    if (sesion && !sesion.revocadoEn) {
      sesion.revocadoEn = new Date();
      await this.sesiones.save(sesion);
    }
  }

  /** SHA-256 (hex) del refreshToken opaco; determinista para lookup indexado. */
  hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async buscarSesionVigente(tokenPlano: string): Promise<Sesion> {
    const sesion = await this.sesiones.findOne({
      where: { tokenHash: this.hashRefresh(tokenPlano) },
    });
    if (
      !sesion ||
      sesion.revocadoEn ||
      sesion.expiraEn.getTime() <= Date.now()
    ) {
      throw new NoAutenticadoException('Refresh token inválido o expirado.');
    }
    return sesion;
  }

  private refreshTtlMs(): number {
    const ttl = this.config.session.refreshTokenTtl.trim();
    const m = /^(\d+)\s*(s|m|h|d)$/.exec(ttl);
    if (!m) {
      throw new Error(
        `REFRESH_TOKEN_TTL inválido: "${ttl}" (usa p. ej. 30d, 12h).`,
      );
    }
    const unidades: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return Number(m[1]) * unidades[m[2]];
  }
}
