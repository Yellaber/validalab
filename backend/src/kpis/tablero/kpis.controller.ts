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
import { TableroIdea, TableroIdeaDto } from './kpis-respuesta';
import { KpisService } from './kpis.service';

@ApiTags('kpis')
@ApiBearerAuth('bearerAuth')
@Controller('ideas/:id/kpis')
export class KpisController {
  constructor(private readonly kpis: KpisService) {}

  /** Devuelve el tablero de KPIs de una idea propia. */
  @Get()
  @ApiOperation({
    summary: 'Consultar el tablero de KPIs de la idea',
    description:
      'Devuelve el `TableroIdea` de una idea propia: los 14 KPIs de la sección 7 del SRS calculados a partir de las entrevistas y contactos, cada uno con su `valor`, sus umbrales vigentes y su `zona` de semáforo, más el `resumen` por zona. Un KPI sin evidencia suficiente trae `valor` `null` y `zona` `sin_datos`.',
  })
  @ApiOkResponse({
    description: 'Tablero de KPIs de la idea.',
    type: TableroIdeaDto,
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
  obtenerTablero(
    @OwnerId() ownerId: string,
    @Param() { id }: IdIdeaParamDto,
  ): Promise<TableroIdea> {
    return this.kpis.calcularTablero(ownerId, id);
  }
}
