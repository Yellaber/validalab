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
import { PaginacionQueryDto } from '../../common/pagination/paginacion.dto';
import { RespuestaPaginada } from '../../common/pagination/respuesta-paginada';
import {
  GuionRespuesta,
  GuionRespuestaDto,
  GuionesPaginadosDto,
} from './guion-respuesta';
import { GuionesService } from './guiones.service';
import {
  ActualizarGuionDto,
  CrearGuionDto,
  IdGuionParamDto,
} from './guiones.dto';

@ApiTags('entrevistas')
@ApiBearerAuth('bearerAuth')
@Controller('guiones')
export class GuionesController {
  constructor(private readonly guiones: GuionesService) {}

  /** Crea un guión reutilizable, asociado al usuario autenticado. */
  @Post()
  @ApiOperation({
    summary: 'Crear un guión de entrevista',
    description:
      'Crea un guión reutilizable entre ideas con sus preguntas ordenadas. El `ownerId` se deriva del token.',
  })
  @ApiCreatedResponse({ description: 'Guión creado.', type: GuionRespuestaDto })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'La validación falló.',
    type: ErrorRespuestaDto,
  })
  crear(
    @OwnerId() ownerId: string,
    @Body() dto: CrearGuionDto,
  ): Promise<GuionRespuesta> {
    return this.guiones.crear(ownerId, dto);
  }

  /** Lista los guiones propios, paginados. */
  @Get()
  @ApiOperation({
    summary: 'Listar los guiones propios',
    description:
      'Devuelve solo los guiones del usuario autenticado, paginados.',
  })
  @ApiOkResponse({
    description: 'Página de guiones propios.',
    type: GuionesPaginadosDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  listar(
    @OwnerId() ownerId: string,
    @Query() query: PaginacionQueryDto,
  ): Promise<RespuestaPaginada<GuionRespuesta>> {
    return this.guiones.listar(ownerId, query);
  }

  /** Consulta un guión propio. */
  @Get(':idGuion')
  @ApiOperation({ summary: 'Consultar un guión propio' })
  @ApiOkResponse({ description: 'Guión solicitado.', type: GuionRespuestaDto })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'El guión pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'El guión no existe.',
    type: ErrorRespuestaDto,
  })
  obtener(
    @OwnerId() ownerId: string,
    @Param() { idGuion }: IdGuionParamDto,
  ): Promise<GuionRespuesta> {
    return this.guiones.obtener(ownerId, idGuion);
  }

  /** Edita un guión propio (las preguntas reemplazan el conjunto ordenado). */
  @Patch(':idGuion')
  @ApiOperation({
    summary: 'Editar un guión propio',
    description:
      'Edita el `nombre`, la `descripcion` y/o las `preguntas` (reemplazando el conjunto ordenado).',
  })
  @ApiOkResponse({ description: 'Guión actualizado.', type: GuionRespuestaDto })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'El guión pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'El guión no existe.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'La validación falló.',
    type: ErrorRespuestaDto,
  })
  actualizar(
    @OwnerId() ownerId: string,
    @Param() { idGuion }: IdGuionParamDto,
    @Body() dto: ActualizarGuionDto,
  ): Promise<GuionRespuesta> {
    return this.guiones.actualizar(ownerId, idGuion, dto);
  }

  /** Elimina un guión propio. */
  @Delete(':idGuion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un guión propio' })
  @ApiNoContentResponse({ description: 'Guión eliminado; sin contenido.' })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'El guión pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'El guión no existe.',
    type: ErrorRespuestaDto,
  })
  eliminar(
    @OwnerId() ownerId: string,
    @Param() { idGuion }: IdGuionParamDto,
  ): Promise<void> {
    return this.guiones.eliminar(ownerId, idGuion);
  }
}
