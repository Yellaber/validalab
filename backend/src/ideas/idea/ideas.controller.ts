import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { OwnerId } from '../../auth/usuario-actual.decorator';
import { ErrorRespuestaDto } from '../../common/errors/error-respuesta.dto';
import { RespuestaPaginada } from '../../common/pagination/respuesta-paginada';
import {
  IdeaRespuesta,
  IdeaRespuestaDto,
  IdeasPaginadasDto,
} from './idea-respuesta';
import { IdeasService } from './ideas.service';
import {
  ActualizarIdeaDto,
  CrearIdeaDto,
  IdIdeaParamDto,
  ListarIdeasQueryDto,
} from './ideas.dto';

@ApiTags('ideas')
@ApiBearerAuth('bearerAuth')
@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideas: IdeasService) {}

  /** Crea una idea en estado `borrador`, asociada al usuario autenticado. */
  @Post()
  @ApiOperation({
    summary: 'Crear una idea',
    description:
      'Crea una idea en estado `borrador`, asociada al usuario autenticado (`ownerId` derivado del token).',
  })
  @ApiCreatedResponse({ description: 'Idea creada.', type: IdeaRespuestaDto })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'La validación de la solicitud falló.',
    type: ErrorRespuestaDto,
  })
  crear(
    @OwnerId() ownerId: string,
    @Body() dto: CrearIdeaDto,
  ): Promise<IdeaRespuesta> {
    return this.ideas.crear(ownerId, dto);
  }

  /** Lista las ideas propias, paginadas, con filtro opcional por `estado`. */
  @Get()
  @ApiOperation({
    summary: 'Listar las ideas propias',
    description:
      'Devuelve solo las ideas del usuario autenticado, paginadas. Admite filtro opcional por `estado`.',
  })
  @ApiOkResponse({
    description: 'Página de ideas propias.',
    type: IdeasPaginadasDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  listar(
    @OwnerId() ownerId: string,
    @Query() query: ListarIdeasQueryDto,
  ): Promise<RespuestaPaginada<IdeaRespuesta>> {
    return this.ideas.listar(ownerId, query);
  }

  /** Consulta una idea propia por `id`. Ajena → 403; inexistente → 404. */
  @Get(':id')
  @ApiOperation({ summary: 'Consultar una idea propia' })
  @ApiOkResponse({ description: 'Idea solicitada.', type: IdeaRespuestaDto })
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
  ): Promise<IdeaRespuesta> {
    return this.ideas.obtener(ownerId, id);
  }

  /** Edita el contenido de una idea propia. No fija el `estado` (veredicto E6). */
  @Patch(':id')
  @ApiOperation({
    summary: 'Editar el contenido de una idea propia',
    description:
      'Edita el contenido (`titulo`, `descripcion`, `problema`, `segmentoBeachhead`). No permite fijar el `estado` a `go`/`pivote`/`kill`, que provienen del veredicto aprobado (E6).',
  })
  @ApiOkResponse({ description: 'Idea actualizada.', type: IdeaRespuestaDto })
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
  actualizar(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
    @Body() dto: ActualizarIdeaDto,
  ): Promise<IdeaRespuesta> {
    return this.ideas.actualizar(ownerId, id, dto);
  }

  /** Archiva una idea propia conservando su evidencia; no la elimina. */
  @Post(':id/archivar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archivar una idea',
    description:
      'Marca la idea propia como `archivada` conservando su evidencia; no la elimina.',
  })
  @ApiOkResponse({ description: 'Idea archivada.', type: IdeaRespuestaDto })
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
  archivar(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
  ): Promise<IdeaRespuesta> {
    return this.ideas.archivar(ownerId, id);
  }

  /** Reabre una idea `archivada`, devolviéndola a `borrador`. */
  @Post(':id/desarchivar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reabrir (desarchivar) una idea archivada',
    description:
      'Devuelve una idea `archivada` al estado `borrador` para retomarla, conservando su evidencia. Si la idea no estaba archivada, responde `409`.',
  })
  @ApiOkResponse({
    description: 'Idea reabierta en estado `borrador`.',
    type: IdeaRespuestaDto,
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
  @ApiConflictResponse({
    description: 'La idea no estaba archivada.',
    type: ErrorRespuestaDto,
  })
  desarchivar(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
  ): Promise<IdeaRespuesta> {
    return this.ideas.desarchivar(ownerId, id);
  }
}
