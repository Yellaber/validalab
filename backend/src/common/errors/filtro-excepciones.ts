import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import {
  CodigoError,
  CODIGO_POR_ESTADO_HTTP,
  DetalleError,
  ESTADO_HTTP_POR_CODIGO,
  SobreError,
} from './codigo-error';
import { ErrorDeDominio } from './dominio.exception';

/** Subconjunto de la respuesta HTTP que necesita el filtro (estilo Express). */
interface RespuestaHttp {
  status(codigo: number): RespuestaHttp;
  json(cuerpo: SobreError): RespuestaHttp;
}

/**
 * Filtro global que normaliza TODA excepción al sobre `Error` del contrato.
 * Orden de reconocimiento: error de dominio → error de validación Zod →
 * `HttpException` de Nest → desconocido (`ERROR_INTERNO`, sin filtrar trazas).
 */
@Catch()
export class FiltroDeExcepciones implements ExceptionFilter {
  private readonly logger = new Logger(FiltroDeExcepciones.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<RespuestaHttp>();
    const sobre = this.aSobreError(exception);
    const estado = ESTADO_HTTP_POR_CODIGO[sobre.codigo];

    // Solo registramos en servidor lo inesperado; nunca llega al cliente.
    if (sobre.codigo === CodigoError.ERROR_INTERNO) {
      this.logger.error(
        'Excepción no controlada',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    respuesta.status(estado).json(sobre);
  }

  private aSobreError(exception: unknown): SobreError {
    if (exception instanceof ErrorDeDominio) {
      return {
        codigo: exception.codigo,
        mensaje: exception.message,
        ...(exception.detalles ? { detalles: exception.detalles } : {}),
      };
    }

    // ZodValidationException extiende BadRequestException, así que debe
    // comprobarse ANTES que HttpException.
    if (exception instanceof ZodValidationException) {
      return {
        codigo: CodigoError.VALIDACION_FALLIDA,
        mensaje: 'La validación de la solicitud falló.',
        detalles: this.detallesDeZod(exception.getZodError()),
      };
    }

    if (exception instanceof HttpException) {
      return this.deHttpException(exception);
    }

    // Desconocido: nunca exponer el mensaje ni la traza al cliente.
    return {
      codigo: CodigoError.ERROR_INTERNO,
      mensaje: 'Error interno del servidor.',
    };
  }

  private detallesDeZod(error: unknown): DetalleError[] {
    const zodError = error as ZodError;
    return zodError.issues.map((issue) => ({
      campo: issue.path.map(String).join('.') || '(raíz)',
      problema: issue.message,
    }));
  }

  private deHttpException(exception: HttpException): SobreError {
    const estado = exception.getStatus();
    const codigo = CODIGO_POR_ESTADO_HTTP[estado] ?? CodigoError.ERROR_INTERNO;

    // Para lo mapeado a interno no revelamos el detalle de la HttpException.
    if (codigo === CodigoError.ERROR_INTERNO) {
      return { codigo, mensaje: 'Error interno del servidor.' };
    }

    return { codigo, mensaje: this.mensajeDeHttp(exception) };
  }

  private mensajeDeHttp(exception: HttpException): string {
    const respuesta = exception.getResponse();
    if (typeof respuesta === 'string') {
      return respuesta;
    }
    const mensaje = (respuesta as { message?: unknown }).message;
    if (typeof mensaje === 'string') {
      return mensaje;
    }
    if (Array.isArray(mensaje)) {
      return mensaje.map(String).join('; ');
    }
    return exception.message;
  }
}
