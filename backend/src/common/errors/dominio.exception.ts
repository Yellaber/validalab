import { CodigoError, DetalleError } from './codigo-error';

/**
 * Base de las excepciones de dominio. El código de dominio lanza estas
 * excepciones (intención semántica), no `HttpException`: el filtro global se
 * encarga de traducirlas al sobre `Error` y al estado HTTP correspondiente.
 */
export class ErrorDeDominio extends Error {
  readonly codigo: CodigoError;
  readonly detalles?: DetalleError[];

  constructor(codigo: CodigoError, mensaje: string, detalles?: DetalleError[]) {
    super(mensaje);
    this.name = new.target.name;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export class NoAutenticadoException extends ErrorDeDominio {
  constructor(mensaje = 'No autenticado.') {
    super(CodigoError.NO_AUTENTICADO, mensaje);
  }
}

export class AccesoDenegadoException extends ErrorDeDominio {
  constructor(mensaje = 'No tienes acceso a este recurso.') {
    super(CodigoError.ACCESO_DENEGADO, mensaje);
  }
}

export class RecursoNoEncontradoException extends ErrorDeDominio {
  constructor(mensaje = 'Recurso no encontrado.') {
    super(CodigoError.RECURSO_NO_ENCONTRADO, mensaje);
  }
}

export class ConflictoException extends ErrorDeDominio {
  constructor(mensaje = 'Conflicto con el estado actual del recurso.') {
    super(CodigoError.CONFLICTO, mensaje);
  }
}

export class ValidacionFallidaException extends ErrorDeDominio {
  constructor(mensaje = 'La validación falló.', detalles?: DetalleError[]) {
    super(CodigoError.VALIDACION_FALLIDA, mensaje, detalles);
  }
}
