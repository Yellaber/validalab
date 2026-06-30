import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';

/**
 * Hashing de contraseñas, aislado tras este servicio para que la librería sea
 * intercambiable. Implementación actual: bcryptjs (JS puro, sin build nativo).
 */
@Injectable()
export class ServicioDeHashing {
  /** Coste de bcrypt (2^rondas). 10 es un equilibrio razonable seguridad/latencia. */
  private readonly rondas = 10;

  /** Devuelve el hash (con sal incluida) de una contraseña en claro. */
  hash(plano: string): Promise<string> {
    return bcrypt.hash(plano, this.rondas);
  }

  /** Indica si una contraseña en claro corresponde a un hash dado. */
  verificar(plano: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plano, hash);
  }
}
