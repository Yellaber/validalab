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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { RespuestaPaginada } from '../../common/pagination/respuesta-paginada';
import {
  EntrevistaRespuesta,
  EntrevistaRespuestaDto,
  EntrevistasPaginadasDto,
} from './entrevista-respuesta';
import { EntrevistasService } from './entrevistas.service';
import { IdIdeaParamDto } from '../../ideas/idea/ideas.dto';
import {
  ActualizarEntrevistaDto,
  AjustarScoreDto,
  CrearEntrevistaDto,
  IdEntrevistaParamDto,
  ListarEntrevistasQueryDto,
} from './entrevistas.dto';

@ApiTags('entrevistas')
@ApiBearerAuth('bearerAuth')
@Controller('ideas/:id/entrevistas')
export class EntrevistasController {
  constructor(private readonly entrevistas: EntrevistasService) {}

  /** Registra una entrevista vinculada a idea + contacto + guión. */
  @Post()
  @ApiOperation({
    summary: 'Registrar una entrevista',
    description:
      'Crea una entrevista de una idea propia vinculada a un `contactoId` de esa idea y un `guionId` propio. Mueve el contacto a `entrevistado`. El scoring nace `pendiente`; el `score` lo produce el agente (chunk posterior).',
  })
  @ApiCreatedResponse({
    description: 'Entrevista creada.',
    type: EntrevistaRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
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
    description: 'El contacto ya fue entrevistado o descartado.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Vínculo inválido o payload mal formado.',
    type: ErrorRespuestaDto,
  })
  crear(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
    @Body() dto: CrearEntrevistaDto,
  ): Promise<EntrevistaRespuesta> {
    return this.entrevistas.crear(ownerId, id, dto);
  }

  /** Lista las entrevistas de una idea propia (filtros por contacto/estado). */
  @Get()
  @ApiOperation({
    summary: 'Listar las entrevistas de la idea',
    description:
      'Devuelve las entrevistas de una idea propia, paginadas, con filtros opcionales por `contactoId` y `estadoScoring`.',
  })
  @ApiOkResponse({
    description: 'Página de entrevistas de la idea.',
    type: EntrevistasPaginadasDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
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
    @Query() query: ListarEntrevistasQueryDto,
  ): Promise<RespuestaPaginada<EntrevistaRespuesta>> {
    return this.entrevistas.listar(ownerId, id, query);
  }

  /** Consulta una entrevista propia. */
  @Get(':idEntrevista')
  @ApiOperation({
    summary: 'Consultar una entrevista propia',
    description:
      'Devuelve la entrevista con sus `respuestas`, `citas`, el `score` (o `null`) y el `ajuste` (o `null`).',
  })
  @ApiOkResponse({
    description: 'Entrevista solicitada.',
    type: EntrevistaRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'La idea pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La idea o la entrevista no existe.',
    type: ErrorRespuestaDto,
  })
  obtener(
    @OwnerId() ownerId: string,
    @Param() { id, idEntrevista }: IdEntrevistaParamDto,
  ): Promise<EntrevistaRespuesta> {
    return this.entrevistas.obtener(ownerId, id, idEntrevista);
  }

  /** Edita las respuestas y/o citas de una entrevista propia. */
  @Patch(':idEntrevista')
  @ApiOperation({
    summary: 'Editar las respuestas y citas de una entrevista',
    description:
      'Edita `respuestas` y/o `citas`. No cambia `ideaId`/`contactoId`/`guionId` ni el `score`. Cambiar `respuestas` reinicia el `estadoScoring` a `pendiente`; cambiar solo `citas` no afecta el scoring.',
  })
  @ApiOkResponse({
    description: 'Entrevista actualizada.',
    type: EntrevistaRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'La idea pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La idea o la entrevista no existe.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'La validación falló.',
    type: ErrorRespuestaDto,
  })
  actualizar(
    @OwnerId() ownerId: string,
    @Param() { id, idEntrevista }: IdEntrevistaParamDto,
    @Body() dto: ActualizarEntrevistaDto,
  ): Promise<EntrevistaRespuesta> {
    return this.entrevistas.actualizar(ownerId, id, idEntrevista, dto);
  }

  /** Elimina una entrevista propia. */
  @Delete(':idEntrevista')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una entrevista' })
  @ApiNoContentResponse({ description: 'Entrevista eliminada; sin contenido.' })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'La idea pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La idea o la entrevista no existe.',
    type: ErrorRespuestaDto,
  })
  eliminar(
    @OwnerId() ownerId: string,
    @Param() { id, idEntrevista }: IdEntrevistaParamDto,
  ): Promise<void> {
    return this.entrevistas.eliminar(ownerId, id, idEntrevista);
  }

  /** Registra el ajuste humano del score conservando el del agente. */
  @Post(':idEntrevista/ajuste-score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ajustar el score del agente',
    description:
      'Registra `scoreAjustado` (0–10) y una `nota`, conservando ambos valores: el `score` del agente y el `ajuste` del usuario (que prevalece en los KPIs, E5).',
  })
  @ApiOkResponse({
    description: 'Entrevista con el ajuste registrado.',
    type: EntrevistaRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'La idea pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La idea o la entrevista no existe.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Score fuera de rango o sin nota.',
    type: ErrorRespuestaDto,
  })
  ajustarScore(
    @OwnerId() ownerId: string,
    @Param() { id, idEntrevista }: IdEntrevistaParamDto,
    @Body() dto: AjustarScoreDto,
  ): Promise<EntrevistaRespuesta> {
    return this.entrevistas.ajustarScore(ownerId, id, idEntrevista, dto);
  }

  /** (Re)dispara el scoring del agente sobre una entrevista propia. */
  @Post(':idEntrevista/puntuar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '(Re)disparar el scoring del agente',
    description:
      'Dispara o vuelve a disparar el scoring del agente sobre una entrevista propia (RF-09b), p. ej. tras un `estadoScoring` `fallida`. El bloque `score` es de solo lectura: lo produce el agente, nunca el cliente. Si la salida no valida tras reintentos, el `estadoScoring` queda `fallida`, sin romper el flujo.',
  })
  @ApiOkResponse({
    description: 'Entrevista con su `estadoScoring` actualizado.',
    type: EntrevistaRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'La idea pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La idea o la entrevista no existe.',
    type: ErrorRespuestaDto,
  })
  puntuar(
    @OwnerId() ownerId: string,
    @Param() { id, idEntrevista }: IdEntrevistaParamDto,
  ): Promise<EntrevistaRespuesta> {
    return this.entrevistas.puntuar(ownerId, id, idEntrevista);
  }
}
