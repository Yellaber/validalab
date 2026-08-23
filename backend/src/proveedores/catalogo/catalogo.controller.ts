import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorRespuestaDto } from '../../common/errors/error-respuesta.dto';
import { ProveedorIaDto } from './catalogo-respuesta';
import { CatalogoService } from './catalogo.service';
import { ProveedorIaDominio } from './proveedor.types';

@ApiTags('proveedores')
@ApiBearerAuth('bearerAuth')
@Controller('proveedores')
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  /** Devuelve el catálogo curado de proveedores y sus modelos. */
  @Get()
  @ApiOperation({
    summary: 'Listar el catálogo curado de proveedores y modelos',
    description:
      'Devuelve los proveedores de IA soportados y, por cada uno, su lista curada de modelos. Los ids de modelo son datos actualizables sin redesplegar. Catálogo global; requiere autenticación.',
  })
  @ApiOkResponse({
    description: 'Catálogo de proveedores soportados con sus modelos.',
    type: [ProveedorIaDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token válido.',
    type: ErrorRespuestaDto,
  })
  listar(): Promise<ProveedorIaDominio[]> {
    return this.catalogo.listar();
  }
}
