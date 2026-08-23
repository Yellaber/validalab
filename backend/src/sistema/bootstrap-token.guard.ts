import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { NoAutenticadoException } from '../common/errors/dominio.exception';

/** Cabecera que transporta el secreto de despliegue. */
export const CABECERA_BOOTSTRAP = 'x-bootstrap-token';

interface RequestConCabeceras {
  headers?: Record<string, unknown>;
}

/**
 * Protege `POST /sistema/inicializar` exigiendo el secreto de despliegue
 * (`BOOTSTRAP_TOKEN`) en la cabecera `X-Bootstrap-Token`.
 *
 * El endpoint va marcado `@Publico()`, que aquí NO significa «abierto»: significa
 * «no autenticado por JWT». No puede haber sesión cuando aún no existe ninguna
 * cuenta, así que la autorización la aporta este guard en su lugar. De hecho
 * NUNCA mira `Authorization`: un `accessToken` válido, por muy legítimo que sea,
 * no sustituye al secreto.
 *
 * Todos los caminos de fallo devuelven el MISMO `401` genérico. El cliente no
 * puede distinguir «el servidor no tiene secreto configurado» de «tu secreto no
 * coincide», ni averiguar si el sistema ya está inicializado — ese `409` solo lo
 * ve quien ya superó este guard. El motivo real queda en los registros del
 * servidor, que es donde el operador lo necesita.
 */
@Injectable()
export class BootstrapTokenGuard implements CanActivate {
  private readonly logger = new Logger(BootstrapTokenGuard.name);

  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const esperado = this.config.bootstrap.token;
    if (!esperado) {
      this.logger.warn(
        'Inicialización rechazada: BOOTSTRAP_TOKEN no está configurado en el ' +
          'servidor. Sin secreto no hay forma de autorizarla; configúralo en el ' +
          'entorno para poder inicializar el sistema.',
      );
      throw new NoAutenticadoException();
    }

    const request = context.switchToHttp().getRequest<RequestConCabeceras>();
    const recibido = request.headers?.[CABECERA_BOOTSTRAP];
    if (typeof recibido !== 'string' || recibido.length === 0) {
      this.logger.warn(
        `Inicialización rechazada: falta la cabecera ${CABECERA_BOOTSTRAP}.`,
      );
      throw new NoAutenticadoException();
    }

    if (!this.coincideEnTiempoConstante(recibido, esperado)) {
      this.logger.warn(
        `Inicialización rechazada: el valor de ${CABECERA_BOOTSTRAP} no coincide.`,
      );
      throw new NoAutenticadoException();
    }

    return true;
  }

  /**
   * Compara en tiempo constante. Una comparación con `===` filtra por
   * temporización cuántos caracteres iniciales coinciden, y aquí el secreto es la
   * única barrera entre un atacante y el control del sistema.
   *
   * `timingSafeEqual` lanza si los buffers difieren en longitud, así que la
   * longitud se compara aparte; esa comprobación revela solo el tamaño del
   * secreto, no su contenido.
   */
  private coincideEnTiempoConstante(
    recibido: string,
    esperado: string,
  ): boolean {
    const a = Buffer.from(recibido, 'utf8');
    const b = Buffer.from(esperado, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
