import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';

const ALGORITMO = 'aes-256-gcm';
const IV_BYTES = 12; // recomendado para GCM
const SEPARADOR = ':';

/**
 * Cifra y descifra secretos en reposo (las API keys BYOK) con AES-256-GCM. La
 * clave (32 bytes) proviene de `BYOK_CLAVE_CIFRADO` (64 hex). El formato del
 * texto cifrado es `iv:authTag:ciphertext` (hex); el authTag garantiza que un
 * texto manipulado falle al descifrar. La clave en claro solo vive en memoria
 * durante el cifrado/descifrado; nunca se persiste ni se loguea.
 */
@Injectable()
export class ServicioDeCifrado {
  private readonly clave: Buffer;

  constructor(config: AppConfigService) {
    this.clave = Buffer.from(config.byok.claveCifrado, 'hex');
  }

  /** Cifra un texto plano; devuelve `iv:authTag:ciphertext` (hex). */
  cifrar(plano: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITMO, this.clave, iv);
    const cifrado = Buffer.concat([
      cipher.update(plano, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      cifrado.toString('hex'),
    ].join(SEPARADOR);
  }

  /** Descifra un texto `iv:authTag:ciphertext`; falla si fue manipulado. */
  descifrar(cifrado: string): string {
    const [ivHex, authTagHex, datosHex] = cifrado.split(SEPARADOR);
    const decipher = createDecipheriv(
      ALGORITMO,
      this.clave,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const plano = Buffer.concat([
      decipher.update(Buffer.from(datosHex, 'hex')),
      decipher.final(),
    ]);
    return plano.toString('utf8');
  }
}
