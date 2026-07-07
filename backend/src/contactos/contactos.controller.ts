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
import { OwnerId } from '../auth/decorators/usuario-actual.decorator';
import { ErrorRespuestaDto } from '../common/errors/error-respuesta.dto';
import { RespuestaPaginada } from '../common/pagination/respuesta-paginada';
import {
  ContactoRespuesta,
  ContactoRespuestaDto,
  ContactosPaginadosDto,
} from './contacto-respuesta';
import { ContactosService } from './contactos.service';
import { IdIdeaParamDto } from '../ideas/idea/ideas.dto';
import {
  ActualizarContactoDto,
  CrearContactoDto,
  IdContactoParamDto,
  ListarContactosQueryDto,
  RegistrarToqueDto,
  TransicionEstadoDto,
} from './contactos.dto';

@ApiTags('contactos')
@ApiBearerAuth('bearerAuth')
@Controller('ideas/:id/contactos')
export class ContactosController {
  constructor(private readonly contactos: ContactosService) {}

  /** Registra un contacto sobre una idea propia, en `por_contactar`. */
  @Post()
  @ApiOperation({
    summary: 'Registrar un contacto de la idea',
    description:
      'Crea un contacto candidato a entrevista sobre una idea propia; nace en `por_contactar`. Su `ideaId` se deriva del path.',
  })
  @ApiCreatedResponse({
    description: 'Contacto creado en estado `por_contactar`.',
    type: ContactoRespuestaDto,
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
  @ApiUnprocessableEntityResponse({
    description: 'La validación falló.',
    type: ErrorRespuestaDto,
  })
  crear(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
    @Body() dto: CrearContactoDto,
  ): Promise<ContactoRespuesta> {
    return this.contactos.crear(ownerId, id, dto);
  }

  /** Lista los contactos de una idea propia, paginados, con filtro por estado. */
  @Get()
  @ApiOperation({
    summary: 'Listar los contactos de la idea',
    description:
      'Devuelve los contactos de una idea propia, paginados. Admite filtro opcional por `estado` del embudo.',
  })
  @ApiOkResponse({
    description: 'Página de contactos de la idea.',
    type: ContactosPaginadosDto,
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
    @Query() query: ListarContactosQueryDto,
  ): Promise<RespuestaPaginada<ContactoRespuesta>> {
    return this.contactos.listar(ownerId, id, query);
  }

  /** Consulta un contacto propio. */
  @Get(':idContacto')
  @ApiOperation({ summary: 'Consultar un contacto propio' })
  @ApiOkResponse({
    description: 'Contacto solicitado.',
    type: ContactoRespuestaDto,
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
    description: 'La idea o el contacto no existe.',
    type: ErrorRespuestaDto,
  })
  obtener(
    @OwnerId() ownerId: string,
    @Param() { id, idContacto }: IdContactoParamDto,
  ): Promise<ContactoRespuesta> {
    return this.contactos.obtener(ownerId, id, idContacto);
  }

  /** Edita el contenido de un contacto propio (nunca el estado del embudo). */
  @Patch(':idContacto')
  @ApiOperation({
    summary: 'Editar el contenido de un contacto',
    description:
      'Edita el contenido (`nombre`, `perfil`, `enlace`, `canal`, `origen`, `referidoPorId`, `notas`). No cambia el `estado` del embudo ni las fechas de toque.',
  })
  @ApiOkResponse({
    description: 'Contacto actualizado.',
    type: ContactoRespuestaDto,
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
    description: 'La idea o el contacto no existe.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'La validación falló.',
    type: ErrorRespuestaDto,
  })
  actualizar(
    @OwnerId() ownerId: string,
    @Param() { id, idContacto }: IdContactoParamDto,
    @Body() dto: ActualizarContactoDto,
  ): Promise<ContactoRespuesta> {
    return this.contactos.actualizar(ownerId, id, idContacto, dto);
  }

  /** Elimina un contacto propio registrado por error. */
  @Delete(':idContacto')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un contacto' })
  @ApiNoContentResponse({ description: 'Contacto eliminado; sin contenido.' })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'La idea pertenece a otro usuario.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La idea o el contacto no existe.',
    type: ErrorRespuestaDto,
  })
  eliminar(
    @OwnerId() ownerId: string,
    @Param() { id, idContacto }: IdContactoParamDto,
  ): Promise<void> {
    return this.contactos.eliminar(ownerId, id, idContacto);
  }

  /** Transiciona un contacto propio por el embudo de outreach. */
  @Post(':idContacto/estado')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transicionar un contacto por el embudo de outreach',
    description:
      'Mueve el contacto entre los estados del embudo. `descartado` desde cualquier no-terminal; `entrevistado` solo lo asigna E4 (aquí → 409). Otras transiciones no permitidas → 409.',
  })
  @ApiOkResponse({
    description: 'Contacto con su nuevo estado.',
    type: ContactoRespuestaDto,
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
    description: 'La idea o el contacto no existe.',
    type: ErrorRespuestaDto,
  })
  @ApiConflictResponse({
    description: 'Transición no permitida del embudo.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Estado fuera del catálogo.',
    type: ErrorRespuestaDto,
  })
  transicionar(
    @OwnerId() ownerId: string,
    @Param() { id, idContacto }: IdContactoParamDto,
    @Body() dto: TransicionEstadoDto,
  ): Promise<ContactoRespuesta> {
    return this.contactos.transicionar(ownerId, id, idContacto, dto.estado);
  }

  /** Registra un toque de outreach (máximo dos por contacto). */
  @Post(':idContacto/toques')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar un toque de outreach (máximo dos)',
    description:
      'Registra un toque con su `fecha` (opcional; por defecto ahora). El primero fija `primerToqueEn`; el segundo, `segundoToqueEn`. El tercero → 409.',
  })
  @ApiOkResponse({
    description: 'Contacto con el toque registrado.',
    type: ContactoRespuestaDto,
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
    description: 'La idea o el contacto no existe.',
    type: ErrorRespuestaDto,
  })
  @ApiConflictResponse({
    description: 'Excede el límite de dos toques.',
    type: ErrorRespuestaDto,
  })
  registrarToque(
    @OwnerId() ownerId: string,
    @Param() { id, idContacto }: IdContactoParamDto,
    @Body() dto: RegistrarToqueDto,
  ): Promise<ContactoRespuesta> {
    return this.contactos.registrarToque(ownerId, id, idContacto, dto.fecha);
  }
}
