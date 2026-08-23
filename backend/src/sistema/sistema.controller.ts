import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Publico } from '../auth/decorators/publico.decorator';
import { ErrorRespuestaDto } from '../common/errors/error-respuesta.dto';
import {
  UsuarioRespuesta,
  UsuarioRespuestaDto,
} from '../usuarios/usuario/usuario-respuesta';
import { BootstrapTokenGuard } from './bootstrap-token.guard';
import { InicializarSistemaDto } from './sistema.dto';
import { SistemaService } from './sistema.service';

@ApiTags('sistema')
@Controller('sistema')
export class SistemaController {
  constructor(private readonly sistema: SistemaService) {}

  /**
   * Inicializa el sistema creando su cuenta administradora de origen.
   *
   * `@Publico()` aquí NO significa «abierto»: significa «no autenticado por
   * JWT». No puede haber sesión cuando aún no existe ninguna cuenta, así que el
   * guard global de JWT debe dejar pasar la petición y la autorización la aporta
   * `BootstrapTokenGuard` con el secreto de despliegue.
   */
  @Publico()
  @UseGuards(BootstrapTokenGuard)
  @ApiSecurity('bootstrapToken')
  @Post('inicializar')
  @ApiOperation({
    summary: 'Inicializar el sistema y crear su cuenta administradora',
    description:
      'Único origen del rol `administrador`. De un solo uso: con el sistema ya ' +
      'inicializado responde `409 CONFLICTO` **aunque el secreto sea correcto**. ' +
      'No existe operación de reversa. Requiere la cabecera `X-Bootstrap-Token` ' +
      'con el secreto de despliegue; la respuesta no incluye sesión, el ' +
      'administrador inicia sesión después por `POST /usuarios/login`.',
  })
  @ApiCreatedResponse({
    description:
      'Sistema inicializado. Devuelve la cuenta creada con rol `administrador` y estado `activo`.',
    type: UsuarioRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el secreto de despliegue o no coincide.',
    type: ErrorRespuestaDto,
  })
  @ApiConflictResponse({
    description: 'El sistema ya fue inicializado.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'La validación de la solicitud falló.',
    type: ErrorRespuestaDto,
  })
  inicializar(@Body() dto: InicializarSistemaDto): Promise<UsuarioRespuesta> {
    return this.sistema.inicializar(dto);
  }
}
