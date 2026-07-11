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

/**
 * Una entrevista no puede existir sin una idea y un contacto (y guión) válidos
 * del mismo usuario (RNF-14). Se traduce a `422 ENTREVISTA_SIN_VINCULO`.
 */
export class EntrevistaSinVinculoException extends ErrorDeDominio {
  constructor(mensaje = 'La entrevista carece de un vínculo válido.') {
    super(CodigoError.ENTREVISTA_SIN_VINCULO, mensaje);
  }
}

/**
 * La API key BYOK no valida contra el proveedor (RF-20). Se traduce a
 * `422 API_KEY_INVALIDA`.
 */
export class ApiKeyInvalidaException extends ErrorDeDominio {
  constructor(mensaje = 'La API key no es válida para el proveedor.') {
    super(CodigoError.API_KEY_INVALIDA, mensaje);
  }
}

/**
 * El proveedor de IA no está disponible (p. ej. no responde al validar la key).
 * Se traduce a `503 PROVEEDOR_IA_NO_DISPONIBLE`.
 */
export class ProveedorNoDisponibleException extends ErrorDeDominio {
  constructor(mensaje = 'El proveedor de IA no está disponible.') {
    super(CodigoError.PROVEEDOR_IA_NO_DISPONIBLE, mensaje);
  }
}

/**
 * El agente no produjo una salida válida tras los reintentos (RF-AG-03). En una
 * operación síncrona (el veredicto, E6) se traduce a `502 SALIDA_AGENTE_INVALIDA`.
 */
export class SalidaAgenteInvalidaException extends ErrorDeDominio {
  constructor(mensaje = 'El agente no produjo una salida válida.') {
    super(CodigoError.SALIDA_AGENTE_INVALIDA, mensaje);
  }
}
