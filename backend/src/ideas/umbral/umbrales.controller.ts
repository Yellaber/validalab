import { Body, Controller, Get, Param, Put } from '@nestjs/common';
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
import {
  UmbralesIdeaDto,
  UmbralRespuesta,
  UmbralRespuestaDto,
} from './umbral-respuesta';
import { UmbralesService } from './umbrales.service';
import { ActualizarUmbralDto, IdKpiParamDto } from './umbrales.dto';
import { IdIdeaParamDto } from '../idea/ideas.dto';

@ApiTags('ideas')
@ApiBearerAuth('bearerAuth')
@Controller('ideas/:id/umbrales')
export class UmbralesController {
  constructor(private readonly umbrales: UmbralesService) {}

  /** Devuelve el conjunto de umbrales de una idea propia (uno por KPI). */
  @Get()
  @ApiOperation({
    summary: 'Consultar los umbrales kill/go de la idea',
    description:
      'Devuelve un `Umbral` por cada KPI del catálogo (SRS §7) con los valores vigentes: el override editado por la idea, o el valor por defecto. `umbralKill` es `null` en los KPIs sin zona kill.',
  })
  @ApiOkResponse({
    description: 'Conjunto de umbrales de la idea, uno por KPI.',
    type: UmbralesIdeaDto,
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
  ): Promise<UmbralRespuesta[]> {
    return this.umbrales.listar(ownerId, id);
  }

  /** Fija (idempotente) el umbral kill/go de un KPI para una idea propia. */
  @Put(':kpi')
  @ApiOperation({
    summary: 'Fijar el umbral kill/go de un KPI para la idea',
    description:
      'Operación idempotente que fija el `umbralGo` y, cuando aplica, el `umbralKill` de un KPI concreto. Un `{kpi}` fuera del catálogo responde `404`; un `umbralKill` mayor que `umbralGo` responde `422`.',
  })
  @ApiOkResponse({
    description: 'Umbral actualizado.',
    type: UmbralRespuestaDto,
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
    description: 'La idea no existe o el KPI no está en el catálogo.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description:
      'La validación de la solicitud falló (p. ej. `umbralKill` > `umbralGo`).',
    type: ErrorRespuestaDto,
  })
  fijar(
    @OwnerId() ownerId: string,
    @Param() { id, kpi }: IdKpiParamDto,
    @Body() dto: ActualizarUmbralDto,
  ): Promise<UmbralRespuesta> {
    return this.umbrales.fijar(ownerId, id, kpi, dto);
  }
}
