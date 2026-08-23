import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
  HipotesisListaDto,
  HipotesisRespuesta,
  HipotesisRespuestaDto,
} from './hipotesis-respuesta';
import { HipotesisService } from './hipotesis.service';
import {
  ActualizarHipotesisDto,
  CrearHipotesisDto,
  IdHipotesisParamDto,
} from './hipotesis.dto';
import { IdIdeaParamDto } from '../idea/ideas.dto';

@ApiTags('ideas')
@ApiBearerAuth('bearerAuth')
@Controller('ideas/:id/hipotesis')
export class HipotesisController {
  constructor(private readonly hipotesis: HipotesisService) {}

  /** Registra una hipótesis tipificada sobre una idea propia, en `pendiente`. */
  @Post()
  @ApiOperation({
    summary: 'Registrar una hipótesis de la idea',
    description:
      'Crea una hipótesis tipificada (`problema`/`mercado`/`pago`) asociada a una idea propia. Nace en estado `pendiente`; su `ideaId` se deriva del path.',
  })
  @ApiCreatedResponse({
    description: 'Hipótesis creada en estado `pendiente`.',
    type: HipotesisRespuestaDto,
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
  @ApiUnprocessableEntityResponse({
    description: 'La validación de la solicitud falló.',
    type: ErrorRespuestaDto,
  })
  crear(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
    @Body() dto: CrearHipotesisDto,
  ): Promise<HipotesisRespuesta> {
    return this.hipotesis.crear(ownerId, id, dto);
  }

  /** Lista las hipótesis de una idea propia (sin paginar). */
  @Get()
  @ApiOperation({
    summary: 'Listar las hipótesis de la idea',
    description:
      'Devuelve las hipótesis de una idea propia como arreglo (sin paginar, por ser una colección pequeña).',
  })
  @ApiOkResponse({
    description: 'Hipótesis de la idea.',
    type: HipotesisListaDto,
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
  ): Promise<HipotesisRespuesta[]> {
    return this.hipotesis.listar(ownerId, id);
  }

  /** Edita una hipótesis propia y/o marca su estado de aprendizaje. */
  @Patch(':idHipotesis')
  @ApiOperation({
    summary: 'Editar una hipótesis y marcar su estado',
    description:
      'Edita el `tipo`/`enunciado` de una hipótesis propia y/o marca su `estado` (`confirmada`/`refutada`/`pendiente`). El cuerpo no permite cambiar el `ideaId`.',
  })
  @ApiOkResponse({
    description: 'Hipótesis actualizada.',
    type: HipotesisRespuestaDto,
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
    description: 'La idea o la hipótesis no existe.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'La validación de la solicitud falló.',
    type: ErrorRespuestaDto,
  })
  actualizar(
    @OwnerId() ownerId: string,
    @Param() { id, idHipotesis }: IdHipotesisParamDto,
    @Body() dto: ActualizarHipotesisDto,
  ): Promise<HipotesisRespuesta> {
    return this.hipotesis.actualizar(ownerId, id, idHipotesis, dto);
  }

  /** Elimina una hipótesis propia registrada por error. */
  @Delete(':idHipotesis')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar una hipótesis',
    description: 'Elimina una hipótesis propia registrada por error.',
  })
  @ApiNoContentResponse({ description: 'Hipótesis eliminada; sin contenido.' })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'La idea pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La idea o la hipótesis no existe.',
    type: ErrorRespuestaDto,
  })
  eliminar(
    @OwnerId() ownerId: string,
    @Param() { id, idHipotesis }: IdHipotesisParamDto,
  ): Promise<void> {
    return this.hipotesis.eliminar(ownerId, id, idHipotesis);
  }
}
