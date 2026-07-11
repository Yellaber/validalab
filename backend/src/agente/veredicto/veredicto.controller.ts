import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
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
import { OwnerId } from '../../auth/decorators/usuario-actual.decorator';
import { ErrorRespuestaDto } from '../../common/errors/error-respuesta.dto';
import { RespuestaPaginada } from '../../common/pagination/respuesta-paginada';
import { IdIdeaParamDto } from '../../ideas/idea/ideas.dto';
import { VeredictoService } from './veredicto.service';
import {
  VeredictoRespuesta,
  VeredictoRespuestaDto,
  VeredictosPaginadosDto,
} from './veredicto-respuesta';
import {
  IdVeredictoParamDto,
  ListarVeredictosQueryDto,
  VerificarVeredictoDto,
} from './veredicto.dto';

@ApiTags('agente')
@ApiBearerAuth('bearerAuth')
@Controller('ideas/:id/veredictos')
export class VeredictoController {
  constructor(private readonly veredictos: VeredictoService) {}

  /** Invoca al agente para emitir un veredicto sobre la idea. */
  @Post()
  @ApiOperation({
    summary: 'Invocar al agente para emitir un veredicto',
    description:
      'Invoca al Validador Inteligente sobre una idea propia para que analice sus KPIs vigentes y emita un veredicto razonado `go`/`pivote`/`kill` (RF-14). No recibe cuerpo: el proveedor y el modelo provienen de la config BYOK del usuario. El veredicto nace en verificación `pendiente` con su snapshot congelado.',
  })
  @ApiCreatedResponse({
    description: 'Veredicto emitido, en verificación `pendiente`.',
    type: VeredictoRespuestaDto,
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
    description: 'Sin configuración BYOK para invocar al agente.',
    type: ErrorRespuestaDto,
  })
  emitir(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
  ): Promise<VeredictoRespuesta> {
    return this.veredictos.emitir(ownerId, id);
  }

  /** Lista el historial de veredictos de la idea, paginado. */
  @Get()
  @ApiOperation({
    summary: 'Listar el historial de veredictos de la idea',
    description:
      'Devuelve el historial de veredictos de una idea propia (RF-17).',
  })
  @ApiOkResponse({
    description: 'Página de veredictos de la idea.',
    type: VeredictosPaginadosDto,
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
  listar(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
    @Query() query: ListarVeredictosQueryDto,
  ): Promise<RespuestaPaginada<VeredictoRespuesta>> {
    return this.veredictos.listar(ownerId, id, query);
  }

  /** Consulta un veredicto propio con su snapshot y verificación. */
  @Get(':idVeredicto')
  @ApiOperation({
    summary: 'Consultar un veredicto propio',
    description:
      'Devuelve el veredicto con su salida, su `snapshotKpis` y su estado de verificación.',
  })
  @ApiOkResponse({
    description: 'Veredicto solicitado.',
    type: VeredictoRespuestaDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorRespuestaDto })
  @ApiForbiddenResponse({
    description: 'El veredicto pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'El veredicto no existe en la idea.',
    type: ErrorRespuestaDto,
  })
  obtener(
    @OwnerId() ownerId: string,
    @Param() { id, idVeredicto }: IdVeredictoParamDto,
  ): Promise<VeredictoRespuesta> {
    return this.veredictos.obtener(ownerId, id, idVeredicto);
  }

  /** Verifica un veredicto pendiente (aprobar o anular). */
  @Post(':idVeredicto/verificacion')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verificar un veredicto (aprobar o anular)',
    description:
      'Gobierno consultivo (RF-16). Aprobar hace firme el veredicto y cambia el estado de la idea (`go`/`pivote`/`kill`) —único camino legítimo—. Anular exige una `nota` y no cambia el estado. Se conservan ambas versiones. Un veredicto ya verificado → `409`.',
  })
  @ApiOkResponse({
    description: 'Veredicto verificado.',
    type: VeredictoRespuestaDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorRespuestaDto })
  @ApiForbiddenResponse({
    description: 'El veredicto pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'El veredicto no existe en la idea.',
    type: ErrorRespuestaDto,
  })
  @ApiConflictResponse({
    description: 'El veredicto ya fue verificado.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Cuerpo inválido (p. ej. anular sin nota).',
    type: ErrorRespuestaDto,
  })
  verificar(
    @OwnerId() ownerId: string,
    @Param() { id, idVeredicto }: IdVeredictoParamDto,
    @Body() dto: VerificarVeredictoDto,
  ): Promise<VeredictoRespuesta> {
    return this.veredictos.verificar(ownerId, id, idVeredicto, dto);
  }
}
