import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorRespuestaDto } from '../../common/errors/error-respuesta.dto';
import { PreciosService } from './precios.service';
import { PrecioModeloRespuesta, TablaPreciosDto } from './precios-respuesta';

@ApiTags('proveedores')
@ApiBearerAuth('bearerAuth')
@Controller('proveedores/precios')
export class PreciosController {
  constructor(private readonly precios: PreciosService) {}

  /** Devuelve la tabla de precios por modelo (global, autenticada). */
  @Get()
  @ApiOperation({
    summary: 'Consultar la tabla de precios por modelo',
    description:
      'Devuelve la tabla de precios por modelo (RF-22e): por proveedor y modelo, el precio de entrada, de salida y de entrada cacheada por millón de tokens, con su `moneda` y `vigenteDesde`. Datos configurables y actualizables sin redesplegar (RNF-18).',
  })
  @ApiOkResponse({
    description: 'Tabla de precios por modelo.',
    type: TablaPreciosDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  listar(): Promise<PrecioModeloRespuesta[]> {
    return this.precios.listar();
  }
}
