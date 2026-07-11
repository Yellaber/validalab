import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { OwnerId } from '../../auth/decorators/usuario-actual.decorator';
import { ErrorRespuestaDto } from '../../common/errors/error-respuesta.dto';
import { IdIdeaParamDto } from '../../ideas/idea/ideas.dto';
import { ReevaluacionService } from './reevaluacion.service';
import {
  EstimacionReevaluacion,
  EstimacionReevaluacionDto,
  ResultadoReevaluacion,
  ResultadoReevaluacionDto,
} from './reevaluacion-respuesta';
import { ReevaluacionLoteDto } from './reevaluacion.dto';

@ApiTags('entrevistas')
@ApiBearerAuth('bearerAuth')
@Controller('ideas/:id/entrevistas/reevaluacion')
export class ReevaluacionController {
  constructor(private readonly reevaluacion: ReevaluacionService) {}

  /** Estima el costo de re-evaluar las entrevistas afectadas, sin ejecutar. */
  @Get('estimacion')
  @ApiOperation({
    summary: 'Estimar el costo de una re-evaluación en lote',
    description:
      'Calcula, SIN ejecutar, el costo estimado de re-evaluar las entrevistas de una idea propia cuya entrada cambió tras un cambio de rúbrica (RF-22h): afectadas, tokens estimados y costo con el `modeloScoring` configurado. No muta ni re-puntúa nada.',
  })
  @ApiOkResponse({
    description: 'Estimación de costo de la re-evaluación (sin ejecutar).',
    type: EstimacionReevaluacionDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorRespuestaDto })
  @ApiForbiddenResponse({
    description: 'La idea pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La idea no existe.',
    type: ErrorRespuestaDto,
  })
  estimar(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
  ): Promise<EstimacionReevaluacion> {
    return this.reevaluacion.estimar(ownerId, id);
  }

  /** Ejecuta la re-evaluación en lote (síncrona, idempotente). */
  @Post()
  @ApiOperation({
    summary: 'Ejecutar una re-evaluación en lote',
    description:
      'Re-evalúa en lote las entrevistas de una idea propia (RF-22h). Por defecto re-evalúa las afectadas; `idsEntrevistas` limita a un subconjunto. Las entrevistas sin cambios se omiten por idempotencia (RF-22c). Acción explícita: un cambio de rúbrica no la dispara. Sin BYOK → `409`; proveedor no disponible → `503`.',
  })
  @ApiOkResponse({
    description:
      'Resultado de la re-evaluación (re-puntuadas, omitidas y costo).',
    type: ResultadoReevaluacionDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorRespuestaDto })
  @ApiForbiddenResponse({
    description: 'La idea pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La idea no existe.',
    type: ErrorRespuestaDto,
  })
  @ApiConflictResponse({
    description: 'Sin configuración BYOK para re-puntuar.',
    type: ErrorRespuestaDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'El proveedor de IA no respondió durante el lote.',
    type: ErrorRespuestaDto,
  })
  ejecutar(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
    @Body() dto: ReevaluacionLoteDto,
  ): Promise<ResultadoReevaluacion> {
    return this.reevaluacion.ejecutar(ownerId, id, dto.idsEntrevistas);
  }
}
