import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { OwnerId } from '../../auth/decorators/usuario-actual.decorator';
import { ErrorRespuestaDto } from '../../common/errors/error-respuesta.dto';
import { IdIdeaParamDto } from '../../ideas/idea/ideas.dto';
import { CostoService } from './costo.service';
import {
  CostoIdea,
  CostoIdeaDto,
  CostoUsuario,
  CostoUsuarioDto,
} from './costo-respuesta';

@ApiTags('proveedores')
@ApiBearerAuth('bearerAuth')
@Controller('costo')
export class CostoUsuarioController {
  constructor(private readonly costo: CostoService) {}

  /** Costo estimado total del usuario autenticado, con desglose por idea. */
  @Get()
  @ApiOperation({
    summary: 'Consultar el costo estimado total propio',
    description:
      'Devuelve el costo estimado acumulado total del usuario autenticado (RF-22f), agregado sobre todas sus ideas y con desglose por idea. Es un estimado del consumo vía ValidaLab, NO el saldo (RNF-17); incluye `urlFacturacion` para recargar en el panel del proveedor.',
  })
  @ApiOkResponse({
    description: 'Costo estimado total del usuario, con desglose por idea.',
    type: CostoUsuarioDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  obtener(@OwnerId() ownerId: string): Promise<CostoUsuario> {
    return this.costo.costoUsuario(ownerId);
  }
}

@ApiTags('proveedores')
@ApiBearerAuth('bearerAuth')
@Controller('ideas/:id/costo')
export class CostoIdeaController {
  constructor(private readonly costo: CostoService) {}

  /** Costo estimado acumulado de una idea propia, con desglose por tarea. */
  @Get()
  @ApiOperation({
    summary: 'Consultar el costo estimado de una idea',
    description:
      'Devuelve el costo estimado acumulado del consumo de IA de una idea propia (RF-22f), con desglose por tarea (`scoring`/`veredicto`), tokens y número de llamadas. Es un estimado del consumo vía ValidaLab, NO el saldo (RNF-17).',
  })
  @ApiOkResponse({
    description: 'Costo estimado acumulado de la idea.',
    type: CostoIdeaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'La idea pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La idea no existe.',
    type: ErrorRespuestaDto,
  })
  obtener(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
  ): Promise<CostoIdea> {
    return this.costo.costoIdea(ownerId, id);
  }
}
