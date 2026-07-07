import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { OwnerId } from '../../auth/decorators/usuario-actual.decorator';
import { ErrorRespuestaDto } from '../../common/errors/error-respuesta.dto';
import {
  ConfiguracionByokDto,
  ConfiguracionByokRespuesta,
} from './configuracion-respuesta';
import { ConfiguracionService } from './configuracion.service';
import { GuardarByokDto } from './configuracion.dto';

@ApiTags('proveedores')
@ApiBearerAuth('bearerAuth')
@Controller('proveedores/configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  /** Consulta la configuración BYOK propia (sin la API key). */
  @Get()
  @ApiOperation({
    summary: 'Consultar la configuración BYOK propia',
    description:
      'Devuelve el proveedor y los dos modelos por tarea, sin la API key (solo `apiKeyRegistrada`). Sin configuración → 404.',
  })
  @ApiOkResponse({
    description: 'Configuración BYOK del usuario (sin la API key).',
    type: ConfiguracionByokDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'El usuario no ha configurado BYOK.',
    type: ErrorRespuestaDto,
  })
  obtener(@OwnerId() ownerId: string): Promise<ConfiguracionByokRespuesta> {
    return this.configuracion.obtener(ownerId);
  }

  /** Guarda o reemplaza (idempotente) la configuración BYOK. */
  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Guardar o cambiar la configuración BYOK',
    description:
      'Crea o reemplaza la configuración con proveedor, apiKey y los dos modelos. La apiKey es write-only (se cifra en reposo, nunca se devuelve) y se valida contra el proveedor: key inválida → 422 API_KEY_INVALIDA; modelo fuera del catálogo → 422 VALIDACION_FALLIDA; proveedor no disponible → 503.',
  })
  @ApiOkResponse({
    description: 'Configuración guardada (sin la API key).',
    type: ConfiguracionByokDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'API key inválida o modelo fuera del catálogo.',
    type: ErrorRespuestaDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'El proveedor de IA no está disponible.',
    type: ErrorRespuestaDto,
  })
  guardar(
    @OwnerId() ownerId: string,
    @Body() dto: GuardarByokDto,
  ): Promise<ConfiguracionByokRespuesta> {
    return this.configuracion.guardar(ownerId, dto);
  }

  /** Revoca la configuración BYOK y su credencial cifrada. */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revocar la configuración BYOK',
    description:
      'Elimina la configuración BYOK del usuario, incluida su credencial cifrada. Sin configuración → 404.',
  })
  @ApiNoContentResponse({
    description: 'Configuración revocada; sin contenido.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'El usuario no ha configurado BYOK.',
    type: ErrorRespuestaDto,
  })
  eliminar(@OwnerId() ownerId: string): Promise<void> {
    return this.configuracion.eliminar(ownerId);
  }
}
