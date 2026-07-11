import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { OwnerId } from '../../auth/decorators/usuario-actual.decorator';
import { ErrorRespuestaDto } from '../../common/errors/error-respuesta.dto';
import { RespuestaPaginada } from '../../common/pagination/respuesta-paginada';
import { IdIdeaParamDto } from '../../ideas/idea/ideas.dto';
import { AlertasService } from './alertas.service';
import {
  AlertaKpiRespuesta,
  AlertaKpiRespuestaDto,
  AlertasPaginadasDto,
} from './alertas-respuesta';
import {
  ActualizarAlertaDto,
  IdAlertaParamDto,
  ListarAlertasQueryDto,
} from './alertas.dto';

@ApiTags('kpis')
@ApiBearerAuth('bearerAuth')
@Controller('ideas/:id/alertas')
export class AlertasController {
  constructor(private readonly alertas: AlertasService) {}

  /** Lista las alertas de una idea propia, paginadas, con filtro por `leida`. */
  @Get()
  @ApiOperation({
    summary: 'Listar las alertas de cruce de umbral de la idea',
    description:
      'Devuelve las alertas de una idea propia generadas por el sistema cuando un KPI cruza su umbral kill o go (RF-13), paginadas y con filtro opcional por `leida`. Las alertas no se crean desde el cliente.',
  })
  @ApiOkResponse({
    description: 'Página de alertas de la idea.',
    type: AlertasPaginadasDto,
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
  listar(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
    @Query() query: ListarAlertasQueryDto,
  ): Promise<RespuestaPaginada<AlertaKpiRespuesta>> {
    return this.alertas.listar(ownerId, id, query);
  }

  /** Marca una alerta propia como leída. */
  @Patch(':idAlerta')
  @ApiOperation({
    summary: 'Marcar una alerta como leída',
    description:
      'Marca una alerta propia como `leida`. El cuerpo se limita al campo `leida`.',
  })
  @ApiOkResponse({
    description: 'Alerta actualizada.',
    type: AlertaKpiRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'La alerta pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La alerta no existe en la idea.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'El cuerpo de la solicitud es inválido.',
    type: ErrorRespuestaDto,
  })
  marcarLeida(
    @OwnerId() ownerId: string,
    @Param() { id, idAlerta }: IdAlertaParamDto,
    @Body() dto: ActualizarAlertaDto,
  ): Promise<AlertaKpiRespuesta> {
    return this.alertas.marcarLeida(ownerId, id, idAlerta, dto.leida);
  }
}
